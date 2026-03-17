package controllers

import (
	"net/http"
	"governanca-ti/config"
	"governanca-ti/models"
	"github.com/gin-gonic/gin"
)

func GetCatalog(c *gin.Context) {
	var items []models.CatalogItem
	config.DB.Find(&items)
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func CreateCatalogItem(c *gin.Context) {
	var input models.CatalogItem
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Create(&input)
	c.JSON(http.StatusOK, gin.H{"data": input})
}

func UpdateCatalogItem(c *gin.Context) {
	id := c.Param("id")
	var item models.CatalogItem
	if err := config.DB.First(&item, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Item não encontrado"})
		return
	}
	if err := c.ShouldBindJSON(&item); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	config.DB.Save(&item)
	c.JSON(http.StatusOK, gin.H{"data": item})
}

func DeleteCatalogItem(c *gin.Context) {
	id := c.Param("id")
	config.DB.Delete(&models.CatalogItem{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Item deletado"})
}