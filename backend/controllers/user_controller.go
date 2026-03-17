package controllers

import (
	"net/http"
	"time"

	"governanca-ti/config"
	"governanca-ti/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// HashPassword recebe uma senha em texto plano e retorna o hash criptografado
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}

// CheckPasswordHash compara a senha digitada com o hash salvo no banco
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos: " + err.Error()})
		return
	}

	hashedPassword, err := HashPassword(input.Senha)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao processar segurança da senha"})
		return
	}
	input.Senha = hashedPassword

	var existingUser models.User
	if err := config.DB.Where("email = ?", input.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Este e-mail já está cadastrado no sistema."})
		return
	}

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao criar usuário no banco."})
		return
	}

	input.Senha = ""
	c.JSON(http.StatusCreated, gin.H{"data": input, "message": "Usuário criado com segurança."})
}

func Login(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required"`
		Senha string `json:"senha" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "E-mail e Senha são obrigatórios"})
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

	user.Senha = "" 

	// --- GERAÇÃO DO CRACHÁ (TOKEN JWT) ---
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
    "user_id": user.ID,
    "email":   user.Email,
    "cargo":   user.Cargo, // <-- ADICIONE ESTA LINHA
    "exp":     time.Now().Add(time.Hour * 12).Unix(),
})

	// jwtSecretKey vem do arquivo auth_middleware.go (que está no mesmo pacote)
	tokenString, err := token.SignedString(jwtSecretKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha ao gerar o token de segurança"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Login realizado com sucesso",
		"token":   tokenString,
		"data":    user,
	})
}

func DeleteUser(c *gin.Context) {
	id := c.Param("id")
	if id == "1" {
		c.JSON(http.StatusForbidden, gin.H{"error": "O Administrador Root não pode ser excluído."})
		return
	}

	if err := config.DB.Delete(&models.User{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao excluir usuário"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Usuário removido com sucesso"})
}