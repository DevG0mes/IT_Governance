package controllers

import (
	"net/http"

	"governanca-ti/config"
	"governanca-ti/models"

	"github.com/gin-gonic/gin"
)

// Busca todas as medições cadastradas
func GetContracts(c *gin.Context) {
	var contracts []models.Contract
	if err := config.DB.Find(&contracts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar contratos: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": contracts})
}

// Salva uma nova medição
func CreateContract(c *gin.Context) {
	var input models.Contract
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	if err := config.DB.Create(&input).Error; err != nil {
		// AQUI ESTÁ O SEGREDO: Mostrar o erro exato do PostgreSQL na tela do React!
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro do Banco de Dados: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": input})
}

// Atualiza uma medição existente
func UpdateContract(c *gin.Context) {
	id := c.Param("id")
	var contract models.Contract

	if err := config.DB.First(&contract, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contrato não encontrado: " + err.Error()})
		return
	}

	var input models.Contract
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	// Atualiza os campos
	contract.Servico = input.Servico
	contract.Fornecedor = input.Fornecedor
	contract.MesCompetencia = input.MesCompetencia
	contract.ValorPrevisto = input.ValorPrevisto
	contract.ValorRealizado = input.ValorRealizado
	contract.UrlContrato = input.UrlContrato

	if err := config.DB.Save(&contract).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar no banco: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": contract})
}

// Exclui uma medição
func DeleteContract(c *gin.Context) {
	id := c.Param("id")
	var contract models.Contract

	if err := config.DB.First(&contract, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contrato não encontrado"})
		return
	}

	if err := config.DB.Delete(&contract).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao excluir: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Contrato excluído com sucesso"})
}