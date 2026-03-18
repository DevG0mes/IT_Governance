package controllers

import (
	"net/http"
	"strings" // Adicionado para validar o "@" do email
	"time"

	"governanca-ti/config"
	"governanca-ti/models"
	"governanca-ti/utils" // Importante: Garante o uso do seu sanitizer.go

	"github.com/gin-gonic/gin"
)

func GetEmployees(c *gin.Context) {
	var employees []models.Employee
	config.DB.Order("nome asc").Find(&employees)
	c.JSON(http.StatusOK, gin.H{"data": employees})
}

func CreateEmployee(c *gin.Context) {
	var input models.Employee
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// --- CAMADA DE ROBUSTEZ (QA) ---
	// Padroniza os dados antes de salvar para evitar sujeira no banco
	input.Nome = utils.StandardizeText(input.Nome)
	input.Email = utils.StandardizeEmail(input.Email)
	input.Departamento = utils.StandardizeText(input.Departamento)

	// Validação básica de Sanidade
	if input.Nome == "" || !strings.Contains(input.Email, "@") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: Nome obrigatório e E-mail deve ser válido."})
		return
	}
	// -------------------------------

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar colaborador no banco"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": input})
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

	// Padroniza na atualização também para manter a integridade
	employee.Nome = utils.StandardizeText(input.Nome)
	employee.Email = utils.StandardizeEmail(input.Email)
	employee.Departamento = utils.StandardizeText(input.Departamento)
	employee.TermoUrl = strings.TrimSpace(input.TermoUrl)

	config.DB.Save(&employee)
	c.JSON(http.StatusOK, gin.H{"message": "Colaborador atualizado com sucesso", "data": employee})
}

func AssignAsset(c *gin.Context) {
	employeeID := c.Param("id")
	var input struct {
		AssetID uint `json:"asset_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID do ativo é obrigatório"})
		return
	}

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este equipamento não está disponível (Status atual: " + string(asset.Status) + ")"})
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

		// 1. REVOGAR HARDWARE AUTOMATICAMENTE
		var activeAssignments []models.AssetAssignment
		tx.Where("employee_id = ? AND returned_at IS NULL", employee.ID).Find(&activeAssignments)

		for _, asg := range activeAssignments {
			asg.ReturnedAt = &now
			tx.Save(&asg)
			tx.Model(&models.Asset{}).Where("id = ?", asg.AssetID).Update("status", models.StatusDisponivel)
		}
		employee.Notebook = ""

		// 2. REVOGAR LICENÇAS (Compliance FinOps)
		var empLicenses []models.EmployeeLicense
		tx.Where("employee_id = ?", employee.ID).Find(&empLicenses)
		for _, el := range empLicenses {
			var lic models.License
			if err := tx.First(&lic, el.LicenseID).Error; err == nil {
				tx.Model(&lic).Update("quantidade_em_uso", lic.QuantidadeEmUso-1)
			}
			tx.Delete(&el)
		}

	} else {
		employee.Status = "Ativo"
		employee.OffboardingDate = nil
	}

	if err := tx.Save(&employee).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar status do colaborador"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Status atualizado e ativos revogados com sucesso"})
}

func UpdateOffboarding(c *gin.Context) {
	id := c.Param("id")
	var emp models.Employee
	if err := config.DB.First(&emp, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Colaborador não encontrado"})
		return
	}

	var input struct {
		OffboardingOnfly   bool   `json:"offboarding_onfly"`
		OffboardingAdm365  bool   `json:"offboarding_adm365"`
		OffboardingLicense bool   `json:"offboarding_license"`
		OffboardingMega    bool   `json:"offboarding_mega"`
		TermoUrl           string `json:"termo_url"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	emp.OffboardingOnfly = input.OffboardingOnfly
	emp.OffboardingAdm365 = input.OffboardingAdm365
	emp.OffboardingLicense = input.OffboardingLicense
	emp.OffboardingMega = input.OffboardingMega
	emp.TermoUrl = strings.TrimSpace(input.TermoUrl)

	config.DB.Save(&emp)
	c.JSON(http.StatusOK, gin.H{"data": emp})
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

	// QA Sec: Antes de excluir, devolve os ativos pro estoque para não "sumirem" do sistema
	var activeAssignments []models.AssetAssignment
	tx.Where("employee_id = ? AND returned_at IS NULL", employee.ID).Find(&activeAssignments)

	for _, asg := range activeAssignments {
		tx.Model(&models.Asset{}).Where("id = ?", asg.AssetID).Update("status", models.StatusDisponivel)
		now := time.Now()
		asg.ReturnedAt = &now
		tx.Save(&asg)
	}

	if err := tx.Delete(&employee).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao excluir colaborador do banco"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Colaborador removido e ativos retornados ao estoque"})
}