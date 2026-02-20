package controllers

import (
	"net/http"
	"time"

	"governanca-ti/config"
	"governanca-ti/models"

	"github.com/gin-gonic/gin"
)

func GetLicenses(c *gin.Context) {
	var licenses []models.License
	config.DB.Preload("EmployeeLicenses").Preload("EmployeeLicenses.Employee").Find(&licenses)
	c.JSON(http.StatusOK, gin.H{"data": licenses})
}

func CreateLicense(c *gin.Context) {
	var input struct {
		Nome            string  `json:"nome" binding:"required"`
		Fornecedor      string  `json:"fornecedor"`
		Plano           string  `json:"plano" binding:"required"`
		Custo           float64 `json:"custo"`
		QuantidadeTotal int     `json:"quantidade_total" binding:"required"`
		DataRenovacao   string  `json:"data_renovacao"` // NOVO
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	license := models.License{
		Nome:            input.Nome,
		Fornecedor:      input.Fornecedor,
		Plano:           input.Plano,
		Custo:           input.Custo,
		QuantidadeTotal: input.QuantidadeTotal,
		QuantidadeEmUso: 0,
		DataRenovacao:   input.DataRenovacao, // SALVANDO
	}

	config.DB.Create(&license)
	c.JSON(http.StatusCreated, gin.H{"data": license})
}

func UpdateLicense(c *gin.Context) {
	id := c.Param("id")
	var license models.License

	if err := config.DB.First(&license, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Licença não encontrada"})
		return
	}

	var input struct {
		Nome            string  `json:"nome"`
		Fornecedor      string  `json:"fornecedor"`
		Plano           string  `json:"plano"`
		Custo           float64 `json:"custo"`
		QuantidadeTotal int     `json:"quantidade_total"`
		DataRenovacao   string  `json:"data_renovacao"` // NOVO
	}
	c.ShouldBindJSON(&input)

	if input.QuantidadeTotal < license.QuantidadeEmUso {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A quantidade total não pode ser menor do que a quantidade que já está em uso!"})
		return
	}

	license.Nome = input.Nome
	license.Fornecedor = input.Fornecedor
	license.Plano = input.Plano
	license.Custo = input.Custo
	license.QuantidadeTotal = input.QuantidadeTotal
	license.DataRenovacao = input.DataRenovacao // SALVANDO
	
	config.DB.Save(&license)

	c.JSON(http.StatusOK, gin.H{"message": "Licença atualizada"})
}

func AssignLicense(c *gin.Context) {
	var input struct {
		EmployeeID uint `json:"employee_id" binding:"required"`
		LicenseID  uint `json:"license_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	tx := config.DB.Begin()

	var license models.License
	if err := tx.First(&license, input.LicenseID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Licença não encontrada"})
		return
	}

	if license.QuantidadeEmUso >= license.QuantidadeTotal {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Todas as licenças deste plano já estão em uso!"})
		return
	}

	var count int64
	tx.Model(&models.EmployeeLicense{}).Where("employee_id = ? AND license_id = ?", input.EmployeeID, input.LicenseID).Count(&count)
	if count > 0 {
		tx.Rollback()
		c.JSON(http.StatusBadRequest, gin.H{"error": "Este colaborador já possui esta licença atribuída!"})
		return
	}

	empLicense := models.EmployeeLicense{
		EmployeeID: input.EmployeeID,
		LicenseID:  input.LicenseID,
		AssignedAt: time.Now(),
	}

	if err := tx.Create(&empLicense).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atribuir"})
		return
	}

	tx.Model(&license).Update("quantidade_em_uso", license.QuantidadeEmUso+1)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Licença atribuída com sucesso!"})
}

func UnassignLicense(c *gin.Context) {
	assignmentID := c.Param("id")
	tx := config.DB.Begin()

	var empLicense models.EmployeeLicense
	if err := tx.First(&empLicense, assignmentID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Vínculo não encontrado"})
		return
	}

	var license models.License
	if err := tx.First(&license, empLicense.LicenseID).Error; err == nil {
		tx.Model(&license).Update("quantidade_em_uso", license.QuantidadeEmUso-1)
	}

	tx.Delete(&empLicense)
	tx.Commit()

	c.JSON(http.StatusOK, gin.H{"message": "Licença revogada com sucesso!"})
}