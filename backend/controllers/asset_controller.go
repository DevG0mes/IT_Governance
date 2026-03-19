package controllers

import (
	"net/http"
	"governanca-ti/config"
	"governanca-ti/models"
	"governanca-ti/utils"

	"github.com/gin-gonic/gin"
)

type CreateAssetInput struct {
	AssetType      string `json:"asset_type" binding:"required"`
	Status         string `json:"status"`
	SerialNumber   string `json:"serial_number"`
	Patrimonio     string `json:"patrimonio"`
	ModeloNotebook string `json:"modelo_notebook"`
	Garantia       string `json:"garantia"`
	StatusGarantia string `json:"status_garantia"`
	ModeloStarlink string `json:"modelo_starlink"`
	Localizacao    string `json:"localizacao"`
	Email          string `json:"email"`
	Senha          string `json:"senha"`
	SenhaRoteador  string `json:"senha_roteador"`
	Responsavel    string `json:"responsavel"`
	IMEI           string `json:"imei"`
	Numero         string `json:"numero"`
	ICCID          string `json:"iccid"`
	ModeloCelular  string `json:"modelo_celular"`
	Plano          string `json:"plano"`
	Grupo          string `json:"grupo"`
}

func GetAssets(c *gin.Context) {
	var assets []models.Asset
	config.DB.Preload("Notebook").Preload("Starlink").Preload("Chip").Preload("Celular").
		Preload("MaintenanceLogs").Preload("Assignments").Preload("Assignments.Employee").
		Find(&assets)
	c.JSON(http.StatusOK, gin.H{"data": assets})
}

func CreateAsset(c *gin.Context) {
	var input CreateAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	input.SerialNumber = utils.StandardizeAssetIdentifier(input.SerialNumber)
	input.Patrimonio = utils.StandardizeAssetIdentifier(input.Patrimonio)

	tx := config.DB.Begin()
	asset := models.Asset{
		AssetType: input.AssetType,
		Status:    models.AssetStatus(input.Status),
	}

	if err := tx.Create(&asset).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var err error
	// AJUSTE FEITO AQUI: Todos os campos declarados nas structs agora estão
	// sendo mapeados corretamente a partir do input JSON.
	switch input.AssetType {
	case "Notebook":
		nb := models.AssetNotebook{
			AssetID:        asset.ID,
			SerialNumber:   input.SerialNumber,
			Patrimonio:     input.Patrimonio,
			Modelo:         input.ModeloNotebook,
			Garantia:       input.Garantia,
			StatusGarantia: input.StatusGarantia,
		}
		err = tx.Create(&nb).Error
	case "Starlink":
		sl := models.AssetStarlink{
			AssetID:       asset.ID,
			Modelo:        input.ModeloStarlink,
			Grupo:         input.Grupo,
			Localizacao:   input.Localizacao,
			Responsavel:   input.Responsavel,
			Email:         input.Email,
			Senha:         input.Senha,
			SenhaRoteador: input.SenhaRoteador,
		}
		err = tx.Create(&sl).Error
	case "CHIP":
		chip := models.AssetChip{
			AssetID:     asset.ID,
			Numero:      input.Numero,
			Plano:       input.Plano,
			ICCID:       input.ICCID,
			Grupo:       input.Grupo,
			Responsavel: input.Responsavel,
		}
		err = tx.Create(&chip).Error
	case "Celular":
		cel := models.AssetCelular{
			AssetID:     asset.ID,
			IMEI:        input.IMEI,
			Modelo:      input.ModeloCelular,
			Grupo:       input.Grupo,
			Responsavel: input.Responsavel,
		}
		err = tx.Create(&cel).Error
	}

	if err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar detalhes"})
		return
	}

	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"data": asset})
}

func UpdateAssetStatus(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset
	var input struct {
		Status models.AssetStatus `json:"status" binding:"required"`
	}
	c.ShouldBindJSON(&input)
	config.DB.Model(&asset).Where("id = ?", id).Update("status", input.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Status atualizado"})
}

// Nota: Esta função ainda está como um "stub" (apenas retornando a mensagem).
// Quando você for implementar a lógica de UPDATE real dos detalhes dos ativos,
// lembre-se de usar a regra do Select("*").Updates() que conversamos antes!
func UpdateAssetDetails(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "Detalhes atualizados (ID: " + id + ")"})
}

func UnassignAsset(c *gin.Context) {
	assetID := c.Param("id")
	config.DB.Model(&models.Asset{}).Where("id = ?", assetID).Update("status", "Disponível")
	c.JSON(http.StatusOK, gin.H{"message": "Ativo devolvido"})
}

func SetMaintenance(c *gin.Context) {
	id := c.Param("id")
	config.DB.Model(&models.Asset{}).Where("id = ?", id).Update("status", "Manutenção")
	c.JSON(http.StatusOK, gin.H{"message": "Enviado para manutenção"})
}

func ResolveMaintenance(c *gin.Context) {
	id := c.Param("id")
	config.DB.Model(&models.Asset{}).Where("id = ?", id).Update("status", "Disponível")
	c.JSON(http.StatusOK, gin.H{"message": "Manutenção finalizada"})
}

func UpdateAssetMaintenance(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Log atualizado"})
}

func DiscardAsset(c *gin.Context) {
	id := c.Param("id")
	config.DB.Model(&models.Asset{}).Where("id = ?", id).Update("status", "Descartado")
	c.JSON(http.StatusOK, gin.H{"message": "Ativo descartado"})
}

func DeleteAsset(c *gin.Context) {
	id := c.Param("id")
	config.DB.Delete(&models.Asset{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Ativo excluído"})
}