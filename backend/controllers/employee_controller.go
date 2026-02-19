package controllers

import (
	"log"
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
		Departamento string `json:"departamento" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	employee := models.Employee{
		Nome:         input.Nome,
		Email:        input.Email,
		Departamento: input.Departamento,
		Status:       "Ativo",
	}

	if err := config.DB.Create(&employee).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": employee})
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

	// REGRA DE HISTÓRICO: Cria registro de início
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
		employee.OffboardingDate = &now // Medida de quando foi desligado

		if employee.Notebook != "" {
			var asset models.AssetNotebook
			if err := tx.Where("patrimonio = ?", employee.Notebook).First(&asset).Error; err == nil {
				var mainAsset models.Asset
				if err := tx.First(&mainAsset, asset.AssetID).Error; err == nil {
					mainAsset.Status = models.StatusDisponivel
					tx.Save(&mainAsset)

					var assignment models.AssetAssignment
					if err := tx.Where("asset_id = ? AND returned_at IS NULL", mainAsset.ID).First(&assignment).Error; err == nil {
						assignment.ReturnedAt = &now
						tx.Save(&assignment)
					}
				}
			}
			employee.Notebook = ""
		}
	} else {
		employee.Status = "Ativo"
		employee.OffboardingDate = nil
	}

	if err := tx.Save(&employee).Error; err != nil {
		tx.Rollback()
		log.Println("Erro:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar status"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Status do colaborador atualizado"})
}

func UpdateOffboarding(c *gin.Context) {
	id := c.Param("id")
	var employee models.Employee

	if err := config.DB.First(&employee, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Colaborador não encontrado"})
		return
	}

	var input struct {
		Onfly   bool `json:"offboarding_onfly"`
		Adm365  bool `json:"offboarding_adm365"`
		License bool `json:"offboarding_license"`
	}
	c.ShouldBindJSON(&input)

	employee.OffboardingOnfly = input.Onfly
	employee.OffboardingAdm365 = input.Adm365
	employee.OffboardingLicense = input.License
	config.DB.Save(&employee)

	c.JSON(http.StatusOK, gin.H{"message": "Checklist atualizado"})
}