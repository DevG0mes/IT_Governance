package main

import (
	"log"

	"governanca-ti/config"
	"governanca-ti/routes"

	"github.com/joho/godotenv"
)

func main() {
	// 1. Carrega as variáveis do .env
	err := godotenv.Load()
	if err != nil {
		log.Println("Aviso: Arquivo .env não encontrado na raiz. O sistema tentará usar variáveis de ambiente do SO.")
	}

	// 2. Conecta ao banco de dados (agora com validação rigorosa)
	config.ConnectDatabase()

	// 3. Inicializa as rotas da API
	r := routes.SetupRouter()

	// 4. Sobe o servidor
	log.Println("Servidor da PSI Energy GovTI rodando na porta 8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Erro ao iniciar o servidor: %v", err)
	}
}