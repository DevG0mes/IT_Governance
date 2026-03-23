package config

import (
	"log"
	"os"

	"governanca-ti/models"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/mysql" // MUDAMOS AQUI: De postgres para mysql
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	// A DSN para MySQL é diferente da do Postgres
	dsn := os.Getenv("DB_URL")

	if dsn == "" {
		log.Fatal("ERRO CRÍTICO: A variável DB_URL não foi encontrada. Verifique seu arquivo .env!")
	}

	// MUDAMOS AQUI: Agora usamos mysql.Open
	database, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatalf("ERRO CRÍTICO: Falha ao conectar ao banco de dados MySQL na Hostinger! Detalhes: %v", err)
	}

	log.Println("Conexão com o MySQL Hostinger estabelecida com sucesso!")

	// Sincronização de tabelas (AutoMigrate no MySQL)
	database.AutoMigrate(
		&models.User{},
		&models.AuditLog{},
		&models.Contract{},
		&models.License{},
		&models.Employee{},
		&models.Asset{},
		&models.AssetNotebook{},
		&models.AssetStarlink{},
		&models.AssetCelular{},
		&models.AssetChip{},
		&models.AssetMaintenanceLog{},
		&models.CatalogItem{},
	)

	log.Println("Sincronização de tabelas no MySQL concluída!")

	// --- CRIAÇÃO DO ADMIN MASTER ---
	var existingAdmin models.User
	if err := database.Where("email = ?", "admin@psi.com.br").First(&existingAdmin).Error; err != nil {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("admin123"), 14)
		
		user := models.User{
			Nome:            "Administrador Root",
			Email:           "admin@psi.com.br",
			Senha:           string(hashedPassword),
			Cargo:           "Administrator",
			PermissionsJSON: `{"dashboard":"edit","inventory":"edit","licenses":"edit","contracts":"edit","catalog":"edit","employees":"edit","maintenance":"edit","offboarding":"edit","export":"edit","import":"edit","admin":"edit"}`,
		}

		database.Create(&user)
		log.Println("✅ Usuário Root criado no MySQL com sucesso!")
	}

	DB = database
}