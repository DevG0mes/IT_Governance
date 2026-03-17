package controllers

import (
	"net/http"
	"time"

	"governanca-ti/config"
	"governanca-ti/models"

	"github.com/gin-gonic/gin"
)

// GetAuditLogs busca o histórico de ações no sistema
func GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	
	// Busca os logs ordenados do mais recente para o mais antigo (limitado aos últimos 200 para não pesar o painel)
	if err := config.DB.Order("timestamp desc").Limit(200).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao buscar logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": logs})
}

// CreateAuditLog registra uma nova ação feita por um usuário
func CreateAuditLog(c *gin.Context) {
	var input models.AuditLog
	
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Garante que a data/hora do log seja exata no momento do registro
	input.Timestamp = time.Now()

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar o log no banco"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Log registrado com sucesso"})
}