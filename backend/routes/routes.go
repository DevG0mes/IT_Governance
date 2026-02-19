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
		api.GET("/assets", controllers.GetAssets)
		api.POST("/assets", controllers.CreateAsset)
		api.PUT("/assets/:id/status", controllers.UpdateAssetStatus)
		api.PUT("/assets/:id/unassign", controllers.UnassignAsset)
		api.PUT("/assets/:id/maintenance", controllers.SetMaintenance)
		api.PUT("/assets/:id/resolve-maintenance", controllers.ResolveMaintenance)
		api.PUT("/assets/:id/details", controllers.UpdateAssetDetails)

		api.GET("/employees", controllers.GetEmployees)
		api.POST("/employees", controllers.CreateEmployee)
		api.PUT("/employees/:id", controllers.UpdateEmployee)
		api.PUT("/employees/:id/assign", controllers.AssignAsset)
		api.PUT("/employees/:id/toggle-status", controllers.ToggleEmployeeStatus)
		api.PUT("/employees/:id/offboarding", controllers.UpdateOffboarding)
		api.PUT("/maintenance/:id", controllers.UpdateMaintenanceLog)
	}

	return r
}