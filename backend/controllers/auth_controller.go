package controllers

import (
	"net/http"
	"governanca-ti/config"
	"governanca-ti/models"
	"github.com/gin-gonic/gin"
)

func Login(c *gin.Context) {
	var creds struct {
		Email string `json:"email"`
		Senha string `json:"senha"`
	}
	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := config.DB.Where("email = ? AND senha = ?", creds.Email, creds.Senha).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "E-mail ou senha incorretos"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": user})
}

func GetUsers(c *gin.Context) {
	var users []models.User
	config.DB.Find(&users)
	c.JSON(http.StatusOK, gin.H{"data": users})
}

func CreateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}
	
	if err := config.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar no banco: " + err.Error()})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{"data": user})
}

func DeleteUser(c *gin.Context) {
	var user models.User
	if err := config.DB.Where("id = ?", c.Param("id")).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Usuário não encontrado"})
		return
	}
	config.DB.Delete(&user)
	c.JSON(http.StatusOK, gin.H{"message": "Usuário deletado"})
}

func GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	config.DB.Order("timestamp desc").Limit(200).Find(&logs)
	c.JSON(http.StatusOK, gin.H{"data": logs})
}

func CreateAuditLog(c *gin.Context) {
	var logEntry models.AuditLog
	c.ShouldBindJSON(&logEntry)
	config.DB.Create(&logEntry)
	c.JSON(http.StatusCreated, gin.H{"data": logEntry})
}