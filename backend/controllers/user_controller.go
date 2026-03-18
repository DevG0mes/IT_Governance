package controllers

import (
	"net/http"
	"time"

	"governanca-ti/config"
	"governanca-ti/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5" // Adicionado para resolver o undefined
	"golang.org/x/crypto/bcrypt"
)

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

func GetUsers(c *gin.Context) {
	var users []models.User
	config.DB.Select("id, nome, email, cargo, permissions_json, created_at").Find(&users)
	c.JSON(http.StatusOK, gin.H{"data": users})
}

func CreateUser(c *gin.Context) {
	var input models.User
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
		return
	}

	hashedPassword, _ := HashPassword(input.Senha)
	input.Senha = hashedPassword

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "E-mail já cadastrado"})
		return
	}

	input.Senha = ""
	c.JSON(http.StatusCreated, gin.H{"data": input})
}

func Login(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required"`
		Senha string `json:"senha" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Campos obrigatórios"})
		return
	}

	var user models.User
	if err := config.DB.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciais inválidas"})
		return
	}

	if !CheckPasswordHash(input.Senha, user.Senha) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciais inválidas"})
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"email":   user.Email,
		"cargo":   user.Cargo,
		"exp":     time.Now().Add(time.Hour * 12).Unix(),
	})

	tokenString, _ := token.SignedString(jwtSecretKey)

	c.JSON(http.StatusOK, gin.H{
		"token": tokenString,
		"data":  user,
	})
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if id == "1" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin Root não pode ser excluído"})
		return
	}
	config.DB.Delete(&models.User{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Usuário removido"})
}