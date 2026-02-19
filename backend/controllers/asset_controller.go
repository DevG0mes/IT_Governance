package controllers

import (
	"net/http"
	"time"

	"governanca-ti/config"
	"governanca-ti/models"

	"github.com/gin-gonic/gin"
)

func GetAssets(c *gin.Context) {
	var assets []models.Asset
	config.DB.Preload("Notebook").Preload("Starlink").Preload("Chip").Preload("Celular").
		Preload("MaintenanceLogs").Preload("Assignments").Preload("Assignments.Employee").
		Find(&assets)
	c.JSON(http.StatusOK, gin.H{"data": assets})
}

type CreateAssetInput struct {
	AssetType      string             `json:"asset_type" binding:"required"`
	Status         models.AssetStatus `json:"status" binding:"required"`
	SerialNumber   string             `json:"serial_number"`
	Patrimonio     string             `json:"patrimonio"`
	ModeloNotebook string             `json:"modelo_notebook"`
	Garantia       string             `json:"garantia"`
	StatusGarantia string             `json:"status_garantia"`
	ModeloStarlink string             `json:"modelo_starlink"`
	Projeto        string             `json:"projeto"`
	Localizacao    string             `json:"localizacao"`
	Email          string             `json:"email"`
	Senha          string             `json:"senha"`
	SenhaRoteador  string             `json:"senha_roteador"`
	Responsavel    string             `json:"responsavel"`
	IMEI           string             `json:"imei"`
	Numero         string             `json:"numero"`
	ICCID          string             `json:"iccid"`          // NOVO
	ModeloCelular  string             `json:"modelo_celular"` // NOVO
}

func CreateAsset(c *gin.Context) {
	var input CreateAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}

	asset := models.Asset{AssetType: input.AssetType, Status: input.Status}
	switch input.AssetType {
	case "Notebook":
		asset.Notebook = &models.AssetNotebook{SerialNumber: input.SerialNumber, Patrimonio: input.Patrimonio, Modelo: input.ModeloNotebook, Garantia: input.Garantia, StatusGarantia: input.StatusGarantia}
	case "Starlink":
		asset.Starlink = &models.AssetStarlink{Modelo: input.ModeloStarlink, Projeto: input.Projeto, Localizacao: input.Localizacao, Email: input.Email, Senha: input.Senha, SenhaRoteador: input.SenhaRoteador, Responsavel: input.Responsavel}
	case "CHIP":
		asset.Chip = &models.AssetChip{ICCID: input.ICCID, Numero: input.Numero, Responsavel: input.Responsavel}
	case "Celular":
		asset.Celular = &models.AssetCelular{Modelo: input.ModeloCelular, IMEI: input.IMEI, Responsavel: input.Responsavel}
	}

	if err := config.DB.Create(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": asset})
}

func UpdateAssetStatus(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset
	if err := config.DB.First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	var input struct{ Status models.AssetStatus `json:"status" binding:"required"` }
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	asset.Status = input.Status
	config.DB.Save(&asset)
	c.JSON(http.StatusOK, gin.H{"data": asset})
}

func UpdateAssetDetails(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset

	if err := config.DB.Preload("Notebook").Preload("Starlink").Preload("Chip").Preload("Celular").First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}
	var input CreateAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if asset.AssetType == "Notebook" && asset.Notebook != nil {
		asset.Notebook.SerialNumber = input.SerialNumber
		asset.Notebook.Patrimonio = input.Patrimonio
		asset.Notebook.Modelo = input.ModeloNotebook
		asset.Notebook.Garantia = input.Garantia
		asset.Notebook.StatusGarantia = input.StatusGarantia
		config.DB.Save(asset.Notebook)
	} else if asset.AssetType == "Starlink" && asset.Starlink != nil {
		asset.Starlink.Modelo = input.ModeloStarlink
		asset.Starlink.Projeto = input.Projeto
		asset.Starlink.Localizacao = input.Localizacao
		asset.Starlink.Email = input.Email
		asset.Starlink.Senha = input.Senha
		asset.Starlink.SenhaRoteador = input.SenhaRoteador
		asset.Starlink.Responsavel = input.Responsavel
		config.DB.Save(asset.Starlink)
	} else if asset.AssetType == "CHIP" && asset.Chip != nil {
		asset.Chip.ICCID = input.ICCID
		asset.Chip.Numero = input.Numero
		asset.Chip.Responsavel = input.Responsavel
		config.DB.Save(asset.Chip)
	} else if asset.AssetType == "Celular" && asset.Celular != nil {
		asset.Celular.Modelo = input.ModeloCelular
		asset.Celular.IMEI = input.IMEI
		asset.Celular.Responsavel = input.Responsavel
		config.DB.Save(asset.Celular)
	}
	c.JSON(http.StatusOK, gin.H{"message": "Detalhes atualizados com sucesso!"})
}

func UnassignAsset(c *gin.Context) {
	assetID := c.Param("id")
	tx := config.DB.Begin()

	var asset models.Asset
	if err := tx.Preload("Notebook").First(&asset, assetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	var assignment models.AssetAssignment
	if err := tx.Where("asset_id = ? AND returned_at IS NULL", asset.ID).First(&assignment).Error; err == nil {
		now := time.Now()
		assignment.ReturnedAt = &now
		tx.Save(&assignment)
	}

	if asset.AssetType == "Notebook" && asset.Notebook != nil {
		var employee models.Employee
		if err := tx.Where("notebook = ?", asset.Notebook.Patrimonio).First(&employee).Error; err == nil {
			employee.Notebook = ""
			tx.Save(&employee)
		}
	}

	asset.Status = models.StatusDisponivel
	tx.Save(&asset)
	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Equipamento removido e devolvido ao estoque."})
}

func SetMaintenance(c *gin.Context) {
	assetID := c.Param("id")
	var input struct {
		Chamado    string `json:"chamado"`
		Observacao string `json:"observacao"`
	}
	c.ShouldBindJSON(&input)

	tx := config.DB.Begin()

	var asset models.Asset
	if err := tx.Preload("Notebook").First(&asset, assetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	if asset.Status == models.StatusEmUso && asset.AssetType == "Notebook" && asset.Notebook != nil {
		var employee models.Employee
		if err := tx.Where("notebook = ?", asset.Notebook.Patrimonio).First(&employee).Error; err == nil {
			employee.Notebook = ""
			tx.Save(&employee)
		}
		var assignment models.AssetAssignment
		if err := tx.Where("asset_id = ? AND returned_at IS NULL", asset.ID).First(&assignment).Error; err == nil {
			now := time.Now()
			assignment.ReturnedAt = &now
			tx.Save(&assignment)
		}
	}

	asset.Status = models.StatusManutencao
	tx.Save(&asset)

	maintenance := models.AssetMaintenanceLog{
		AssetID:    asset.ID,
		Chamado:    input.Chamado,
		Observacao: input.Observacao,
		CreatedAt:  time.Now(),
	}
	tx.Create(&maintenance)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Equipamento enviado para manutenção."})
}

func ResolveMaintenance(c *gin.Context) {
	assetID := c.Param("id")
	tx := config.DB.Begin()

	var asset models.Asset
	if err := tx.First(&asset, assetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	asset.Status = models.StatusDisponivel
	tx.Save(&asset)

	var maintenance models.AssetMaintenanceLog
	if err := tx.Where("asset_id = ? AND resolved_at IS NULL", asset.ID).First(&maintenance).Error; err == nil {
		now := time.Now()
		maintenance.ResolvedAt = &now
		tx.Save(&maintenance)
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Manutenção finalizada!"})
}

func UpdateMaintenanceLog(c *gin.Context) {
	logID := c.Param("id")
	var mLog models.AssetMaintenanceLog

	if err := config.DB.First(&mLog, logID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Log não encontrado"})
		return
	}

	var input struct {
		Chamado    string `json:"chamado"`
		Observacao string `json:"observacao"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	mLog.Chamado = input.Chamado
	mLog.Observacao = input.Observacao
	config.DB.Save(&mLog)

	c.JSON(http.StatusOK, gin.H{"message": "Manutenção atualizada com sucesso!"})
}