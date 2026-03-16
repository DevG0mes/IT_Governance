package controllers

import (
	"net/http"
	"time"

	"governanca-ti/config"
	"governanca-ti/models"

	"github.com/gin-gonic/gin"
)

func GetEmployees(c *gin.Context) {
	var employees []models.Employee
	config.DB.Order("nome asc").Find(&employees)
	c.JSON(http.StatusOK, gin.H{"data": employees})
}

func CreateEmployee(c *gin.Context) {
	var input struct {
		Nome         string `json:"nome" binding:"required"`
		Email        string `json:"email" binding:"required"`
		Departamento string `json:"departamento"`
	}

	// Tenta ler o JSON enviado pelo React
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: Nome e Email são obrigatórios"})
		return
	}

	var existingEmployee models.Employee
	
	// --- A MÁGICA DO UPSERT COMEÇA AQUI ---
	// Verifica se o E-mail já existe no banco de dados
	if err := config.DB.Where("email = ?", input.Email).First(&existingEmployee).Error; err == nil {
		// SE EXISTIR: Nós atualizamos o nome (para consertar os acentos) e o departamento!
		existingEmployee.Nome = input.Nome
		existingEmployee.Departamento = input.Departamento
		config.DB.Save(&existingEmployee) // Salva a correção no banco
		
		c.JSON(http.StatusOK, gin.H{
			"message": "Colaborador atualizado com sucesso", 
			"data": existingEmployee,
		})
		return
	}
	// --- FIM DA MÁGICA ---

	// Se o e-mail NÃO EXISTIR, ele cria um novo colaborador do zero (comportamento normal)
	newEmployee := models.Employee{
		Nome:         input.Nome,
		Email:        input.Email,
		Departamento: input.Departamento,
		Status:       "Ativo",
	}

	if err := config.DB.Create(&newEmployee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar colaborador no banco"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": newEmployee})
}
func UpdateEmployee(c *gin.Context) {
	id := c.Param("id")
	var employee models.Employee

	if err := config.DB.First(&employee, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Colaborador não encontrado"})
		return
	}

	var input struct {
		Nome         string `json:"nome"`
		Email        string `json:"email"`
		Departamento string `json:"departamento"`
		TermoUrl     string `json:"termo_url"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee.Nome = input.Nome
	employee.Email = input.Email
	employee.Departamento = input.Departamento
	employee.TermoUrl = input.TermoUrl

	config.DB.Save(&employee)
	c.JSON(http.StatusOK, gin.H{"message": "Colaborador atualizado"})
}

func AssignAsset(c *gin.Context) {
	employeeID := c.Param("id")
	var input struct {
		AssetID uint `json:"asset_id" binding:"required"`
	}
	c.ShouldBindJSON(&input)

	tx := config.DB.Begin()

	var employee models.Employee
	if err := tx.First(&employee, employeeID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Colaborador não encontrado"})
		return
	}

	if employee.Status == "Desligado" {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Não é possível atribuir equipamento a um colaborador desligado"})
		return
	}

	var asset models.Asset
	if err := tx.Preload("Notebook").First(&asset, input.AssetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Equipamento não encontrado"})
		return
	}

	if asset.Status != models.StatusDisponivel {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este equipamento não está disponível"})
		return
	}

	asset.Status = models.StatusEmUso
	tx.Save(&asset)

	if asset.AssetType == "Notebook" && asset.Notebook != nil {
		employee.Notebook = asset.Notebook.Patrimonio
		tx.Save(&employee)
	}

	assignment := models.AssetAssignment{
		EmployeeID: employee.ID,
		AssetID:    asset.ID,
		AssignedAt: time.Now(),
	}
	tx.Create(&assignment)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Equipamento atribuído com sucesso!"})
}

func ToggleEmployeeStatus(c *gin.Context) {
	id := c.Param("id")
	tx := config.DB.Begin()

	var employee models.Employee
	if err := tx.First(&employee, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Colaborador não encontrado"})
		return
	}

	if employee.Status == "Ativo" || employee.Status == "" {
		employee.Status = "Desligado"
		now := time.Now()
		employee.OffboardingDate = &now

		// 1. ARRANCAR HARDWARE
		var activeAssignments []models.AssetAssignment
		tx.Where("employee_id = ? AND returned_at IS NULL", employee.ID).Find(&activeAssignments)

		for _, asg := range activeAssignments {
			asg.ReturnedAt = &now
			tx.Save(&asg)
			var asset models.Asset
			if err := tx.First(&asset, asg.AssetID).Error; err == nil {
				asset.Status = models.StatusDisponivel
				tx.Save(&asset)
			}
		}
		employee.Notebook = "" 

		// 2. ARRANCAR LICENÇAS (FinOps)
		var empLicenses []models.EmployeeLicense
		tx.Where("employee_id = ?", employee.ID).Find(&empLicenses)
		for _, el := range empLicenses {
			var lic models.License
			if err := tx.First(&lic, el.LicenseID).Error; err == nil {
				tx.Model(&lic).Update("quantidade_em_uso", lic.QuantidadeEmUso-1)
			}
			tx.Delete(&el) // Apaga o vínculo permanentemente
		}

	} else {
		employee.Status = "Ativo"
		employee.OffboardingDate = nil
	}

	if err := tx.Save(&employee).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar status"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Status do colaborador atualizado e ativos revogados"})
}

func UpdateOffboarding(c *gin.Context) {
	id := c.Param("id")
	var employee models.Employee

	if err := config.DB.First(&employee, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Colaborador não encontrado"})
		return
	}

	var input struct {
		Onfly    bool   `json:"offboarding_onfly"`
		Adm365   bool   `json:"offboarding_adm365"`
		License  bool   `json:"offboarding_license"`
		TermoUrl string `json:"termo_url"`
	}
	c.ShouldBindJSON(&input)

	employee.OffboardingOnfly = input.Onfly
	employee.OffboardingAdm365 = input.Adm365
	employee.OffboardingLicense = input.License
	employee.TermoUrl = input.TermoUrl

	config.DB.Save(&employee)

	c.JSON(http.StatusOK, gin.H{"message": "Checklist e Termo atualizados"})
}

func DeleteEmployee(c *gin.Context) {
	id := c.Param("id")
	tx := config.DB.Begin()

	var employee models.Employee
	if err := tx.First(&employee, id).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Colaborador não encontrado"})
		return
	}

	// Limpa qualquer ativo que ele possua e devolve ao estoque
	var activeAssignments []models.AssetAssignment
	tx.Where("employee_id = ? AND returned_at IS NULL", employee.ID).Find(&activeAssignments)

	for _, asg := range activeAssignments {
		var asset models.Asset
		if err := tx.First(&asset, asg.AssetID).Error; err == nil {
			asset.Status = models.StatusDisponivel
			tx.Save(&asset)
		}
	}

	// Exclui o cadastro da base de dados
	if err := tx.Delete(&employee).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao excluir colaborador do banco de dados"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Colaborador excluído com sucesso"})
}