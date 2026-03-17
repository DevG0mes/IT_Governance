package config

import (
	"log"
	"os"

	"governanca-ti/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	dsn := os.Getenv("DB_URL")

	if dsn == "" {
		log.Fatal("ERRO CRÍTICO: A variável DB_URL não foi encontrada. Verifique seu arquivo .env!")
	}

	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	if err != nil {
		log.Fatalf("ERRO CRÍTICO: Falha ao conectar ao banco de dados PostgreSQL! Detalhes: %v", err)
	}

	log.Println("Conexão com o banco de dados PostgreSQL estabelecida com sucesso!")
	log.Println("Verificando se há colunas novas para criar no banco...")

	// SOLUÇÃO DEFINITIVA: Migrar tabela por tabela individualmente!
	// Assim, se uma tabela antiga der um aviso bobo, ele não trava a criação das novas.
	database.AutoMigrate(&models.User{})
	database.AutoMigrate(&models.AuditLog{})
	database.AutoMigrate(&models.Contract{})
	database.AutoMigrate(&models.License{})
	database.AutoMigrate(&models.Employee{})
	database.AutoMigrate(&models.Asset{})
	database.AutoMigrate(&models.AssetNotebook{})
	database.AutoMigrate(&models.AssetStarlink{})
	database.AutoMigrate(&models.AssetCelular{})
	database.AutoMigrate(&models.AssetChip{})
	database.AutoMigrate(&models.AssetMaintenanceLog{})
	database.AutoMigrate(&models.CatalogItem{})

	log.Println("Sincronização de tabelas concluída!")

	// --- CRIAÇÃO DO ADMIN COM PERMISSÕES FULL ---
	user := models.User{
		Nome:            "Administrador Root",
		Email:           "admin@psi.com.br",
		Senha:           "admin",
		Cargo:           "Administrator",
		PermissionsJSON: `{"dashboard":"edit","inventory":"edit","licenses":"edit","contracts":"edit","employees":"edit","maintenance":"edit","offboarding":"edit","export":"edit","import":"edit","admin":"edit"}`,
	}

	// Tenta encontrar o admin. Se não achar, cria na hora!
	if err := database.Where("email = ?", "admin@psi.com.br").FirstOrCreate(&user).Error; err != nil {
		log.Println("❌ Erro ao criar usuário admin no banco:", err)
	} else {
		log.Println("✅ Verificação de Segurança: Usuário Admin validado no banco!")
	}
	// ----------------------------------------

	DB = database
}