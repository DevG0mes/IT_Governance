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
	ICCID          string             `json:"iccid"`
	ModeloCelular  string             `json:"modelo_celular"`
}

func CreateAsset(c *gin.Context) {
	var input CreateAssetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido"})
		return
	}

	// REGRA DE OURO: Validação de Patrimônio e Serial Únicos antes de criar
	if input.AssetType == "Notebook" {
		var count int64
		config.DB.Model(&models.AssetNotebook{}).Where("serial_number = ? OR patrimonio = ?", input.SerialNumber, input.Patrimonio).Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe um Notebook cadastrado com este Serial Number ou Patrimônio!"})
			return
		}
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
	
	if err := config.DB.Model(&asset).Update("status", input.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro do banco: " + err.Error()})
		return
	}

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
		// REGRA DE OURO: Validação na hora da Edição (Garante que não está roubando o número de OUTRO Notebook)
		var count int64
		config.DB.Model(&models.AssetNotebook{}).Where("(serial_number = ? OR patrimonio = ?) AND asset_id != ?", input.SerialNumber, input.Patrimonio, asset.ID).Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe OUTRO Notebook no estoque usando esse Serial Number ou Patrimônio!"})
			return
		}

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
	if err := tx.Preload("Notebook").Preload("Chip").Preload("Celular").Preload("Starlink").First(&asset, assetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	var assignments []models.AssetAssignment
	tx.Where("asset_id = ? AND returned_at IS NULL", asset.ID).Find(&assignments)
	for _, asg := range assignments {
		now := time.Now()
		asg.ReturnedAt = &now
		if err := tx.Save(&asg).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro no histórico: " + err.Error()})
			return
		}
	}

	if asset.AssetType == "Notebook" && asset.Notebook != nil && asset.Notebook.Patrimonio != "" {
		var emps []models.Employee
		tx.Where("notebook = ?", asset.Notebook.Patrimonio).Find(&emps)
		for _, e := range emps { e.Notebook = ""; tx.Save(&e) }
	}
	if asset.AssetType == "CHIP" && asset.Chip != nil && asset.Chip.Numero != "" {
		var emps []models.Employee
		tx.Where("chip = ?", asset.Chip.Numero).Find(&emps)
		for _, e := range emps { e.Chip = ""; tx.Save(&e) }
	}

	if err := tx.Model(&asset).Update("status", models.StatusDisponivel).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha no banco ao atualizar status: " + err.Error()})
		return
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Equipamento removido e devolvido ao estoque."})
}

func SetMaintenance(c *gin.Context) {
	assetID := c.Param("id")
	var input struct {
		Chamado    string `json:"chamado"`
		Observacao string `json:"observacao"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Falha ao ler os dados do formulário"})
		return
	}

	tx := config.DB.Begin()

	var asset models.Asset
	if err := tx.Preload("Notebook").Preload("Chip").Preload("Celular").Preload("Starlink").First(&asset, assetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	if asset.Status == models.StatusEmUso {
		if asset.AssetType == "Notebook" && asset.Notebook != nil && asset.Notebook.Patrimonio != "" {
			var emps []models.Employee
			tx.Where("notebook = ?", asset.Notebook.Patrimonio).Find(&emps)
			for _, e := range emps { e.Notebook = ""; tx.Save(&e) }
		}
		if asset.AssetType == "CHIP" && asset.Chip != nil && asset.Chip.Numero != "" {
			var emps []models.Employee
			tx.Where("chip = ?", asset.Chip.Numero).Find(&emps)
			for _, e := range emps { e.Chip = ""; tx.Save(&e) }
		}
		var assignment models.AssetAssignment
		if err := tx.Where("asset_id = ? AND returned_at IS NULL", asset.ID).First(&assignment).Error; err == nil {
			now := time.Now()
			assignment.ReturnedAt = &now
			tx.Save(&assignment)
		}
	}

	if err := tx.Model(&asset).Update("status", models.StatusManutencao).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha no banco ao atualizar status: " + err.Error()})
		return
	}

	maintenance := models.AssetMaintenanceLog{
		AssetID:    asset.ID,
		Chamado:    input.Chamado,
		Observacao: input.Observacao,
		CreatedAt:  time.Now(),
	}
	if err := tx.Create(&maintenance).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar histórico de manutenção: " + err.Error()})
		return
	}

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

	if err := tx.Model(&asset).Update("status", models.StatusDisponivel).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Falha no banco ao atualizar status: " + err.Error()})
		return
	}

	var maintenance models.AssetMaintenanceLog
	if err := tx.Where("asset_id = ? AND resolved_at IS NULL", asset.ID).First(&maintenance).Error; err == nil {
		now := time.Now()
		maintenance.ResolvedAt = &now
		tx.Save(&maintenance)
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Manutenção finalizada!"})
}

func UpdateAssetMaintenance(c *gin.Context) {
	assetID := c.Param("id")
	var input struct {
		Chamado    string `json:"chamado"`
		Observacao string `json:"observacao"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tx := config.DB.Begin()

	var asset models.Asset
	if err := tx.First(&asset, assetID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	var mLog models.AssetMaintenanceLog
	if err := tx.Where("asset_id = ? AND resolved_at IS NULL", asset.ID).First(&mLog).Error; err != nil {
		mLog = models.AssetMaintenanceLog{
			AssetID:    asset.ID,
			Chamado:    input.Chamado,
			Observacao: input.Observacao,
			CreatedAt:  time.Now(),
		}
		if err := tx.Create(&mLog).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar log de manutenção: " + err.Error()})
			return
		}
	} else {
		mLog.Chamado = input.Chamado
		mLog.Observacao = input.Observacao
		if err := tx.Save(&mLog).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar log: " + err.Error()})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Tratativa atualizada com sucesso!"})
}

func DiscardAsset(c *gin.Context) {
    var input struct {
        Status     string `json:"status"`
        Observacao string `json:"observacao"` // Agora recebe o motivo do Frontend
    }
    if err := c.ShouldBindJSON(&input); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos"})
        return
    }

    assetID := c.Param("id")
    var asset models.Asset
    
    if err := config.DB.First(&asset, assetID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
        return
    }

    if asset.Status == "Em uso" {
        c.JSON(http.StatusForbidden, gin.H{"error": "Remova a atribuição antes de descartar este item."})
        return
    }

    // Salva o status e a justificativa no banco de dados
    asset.Status = models.AssetStatus(input.Status)
    asset.Observacao = input.Observacao 
    config.DB.Save(&asset)

    c.JSON(http.StatusOK, gin.H{"message": "Ativo atualizado para " + input.Status})
}