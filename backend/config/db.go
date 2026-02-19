package config

import (
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// Puxa a string de conexão do arquivo .env
	dsn := os.Getenv("DB_URL")
	
	if dsn == "" {
		log.Fatal("ERRO CRÍTICO: A variável DB_URL não foi encontrada. Verifique seu arquivo .env!")
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatalf("ERRO CRÍTICO: Falha ao conectar ao banco de dados PostgreSQL! Detalhes: %v", err)
	}

	log.Println("Conexão com o banco de dados PostgreSQL estabelecida com sucesso!")
	DB = database
}