package routes

import (
	"governanca-ti/controllers"

	"github.com/gin-gonic/gin"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	api := r.Group("/api")
	{
		// Hardwares
		api.GET("/assets", controllers.GetAssets)
		api.POST("/assets", controllers.CreateAsset)
		api.PUT("/assets/:id/status", controllers.UpdateAssetStatus)
		api.PUT("/assets/:id/unassign", controllers.UnassignAsset)
		api.PUT("/assets/:id/maintenance", controllers.SetMaintenance)
		api.PUT("/assets/:id/resolve-maintenance", controllers.ResolveMaintenance)
		api.PUT("/assets/:id/details", controllers.UpdateAssetDetails)
		api.PUT("/assets/:id/update-maintenance", controllers.UpdateAssetMaintenance)
		api.DELETE("/assets/:id", controllers.DeleteAsset)
		api.PUT("/assets/:id/discard", controllers.DiscardAsset)

		// Licenças
		api.GET("/licenses", controllers.GetLicenses)
		api.POST("/licenses", controllers.CreateLicense)
		api.PUT("/licenses/:id", controllers.UpdateLicense)
		api.POST("/licenses/assign", controllers.AssignLicense)
		api.DELETE("/licenses/unassign/:id", controllers.UnassignLicense)

		// Colaboradores
		api.GET("/employees", controllers.GetEmployees)
		api.POST("/employees", controllers.CreateEmployee)
		api.PUT("/employees/:id", controllers.UpdateEmployee)
		api.DELETE("/employees/:id", controllers.DeleteEmployee)
		api.PUT("/employees/:id/assign", controllers.AssignAsset)
		api.PUT("/employees/:id/toggle-status", controllers.ToggleEmployeeStatus)
		api.PUT("/employees/:id/offboarding", controllers.UpdateOffboarding)

		// --- Rotas de Contratos & Serviços ---
		// (Ajustadas para não duplicar o /api)
		api.GET("/contracts", controllers.GetContracts)
		api.POST("/contracts", controllers.CreateContract)
		api.PUT("/contracts/:id", controllers.UpdateContract)
		api.DELETE("/contracts/:id", controllers.DeleteContract)

		// --- Autenticação, Usuários e Logs ---
		api.POST("/login", controllers.Login)
		api.GET("/users", controllers.GetUsers)
		api.POST("/users", controllers.CreateUser)
		api.DELETE("/users/:id", controllers.DeleteUser)
		api.GET("/audit-logs", controllers.GetAuditLogs)
		api.POST("/audit-logs", controllers.CreateAuditLog)

		// Catálogo de Preços
		api.GET("/catalog", controllers.GetCatalog)
		api.POST("/catalog", controllers.CreateCatalogItem)
		api.PUT("/catalog/:id", controllers.UpdateCatalogItem)
		api.DELETE("/catalog/:id", controllers.DeleteCatalogItem)
	}

	return r
}