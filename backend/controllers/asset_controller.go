package controllers

import (
	"net/http"
	"time"

	"governanca-ti/config"
	"governanca-ti/models"

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
		c.JSON(http.StatusBadRequest, gin.H{"error": "JSON inválido: " + err.Error()})
		return
	}

	if input.Status == "" {
		input.Status = "Disponível"
	}

	// REGRA DE BLOQUEIO DE DUPLICIDADE IGNORANDO #N/D
	if input.AssetType == "Notebook" {
		var count int64
		config.DB.Model(&models.AssetNotebook{}).
			Where("(serial_number = ? AND serial_number != '' AND serial_number NOT LIKE 'Sem-Serial%' AND serial_number != '#N/D' AND serial_number != 'N/A') OR (patrimonio = ? AND patrimonio != '' AND patrimonio NOT LIKE 'Sem-Patr%' AND patrimonio != '#N/D' AND patrimonio != 'N/A')", input.SerialNumber, input.Patrimonio).
			Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe um Notebook cadastrado com este Serial Number ou Patrimônio!"})
			return
		}
	} else if input.AssetType == "Celular" {
		var count int64
		config.DB.Model(&models.AssetCelular{}).
			Where("imei = ? AND imei != '' AND imei NOT LIKE 'Sem-IMEI%' AND imei != '#N/D' AND imei != 'N/A'", input.IMEI).
			Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe um Celular cadastrado com este IMEI no sistema!"})
			return
		}
	} else if input.AssetType == "CHIP" {
		var count int64
		config.DB.Model(&models.AssetChip{}).
			Where("(numero = ? AND numero != '' AND numero NOT LIKE 'S/Num%' AND numero != '#N/D' AND numero != 'N/A') OR (iccid = ? AND iccid != '' AND iccid != 'N/A' AND iccid != '#N/D')", input.Numero, input.ICCID).
			Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe um CHIP cadastrado com este Número ou ICCID no sistema!"})
			return
		}
	}

	// PASSO 1: Cria o PAI
	asset := models.Asset{
		AssetType: input.AssetType,
		Status:    models.AssetStatus(input.Status),
	}

	if err := config.DB.Create(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// PASSO 2: Cria o FILHO
	switch input.AssetType {
	case "Notebook":
		nb := models.AssetNotebook{AssetID: asset.ID, SerialNumber: input.SerialNumber, Patrimonio: input.Patrimonio, Modelo: input.ModeloNotebook, Garantia: input.Garantia, StatusGarantia: input.StatusGarantia}
		config.DB.Create(&nb)
	case "Starlink":
		sl := models.AssetStarlink{AssetID: asset.ID, Modelo: input.ModeloStarlink, Grupo: input.Grupo, Localizacao: input.Localizacao, Email: input.Email, Senha: input.Senha, SenhaRoteador: input.SenhaRoteador, Responsavel: input.Responsavel}
		config.DB.Create(&sl)
	case "CHIP":
		chip := models.AssetChip{AssetID: asset.ID, ICCID: input.ICCID, Numero: input.Numero, Plano: input.Plano, Grupo: input.Grupo, Responsavel: input.Responsavel}
		config.DB.Create(&chip)
	case "Celular":
		cel := models.AssetCelular{AssetID: asset.ID, Modelo: input.ModeloCelular, IMEI: input.IMEI, Grupo: input.Grupo, Responsavel: input.Responsavel}
		config.DB.Create(&cel)
	}

	config.DB.Preload("Notebook").Preload("Starlink").Preload("Chip").Preload("Celular").First(&asset, asset.ID)
	c.JSON(http.StatusCreated, gin.H{"data": asset})
}

func UpdateAssetStatus(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset
	if err := config.DB.First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	var input struct {
		Status models.AssetStatus `json:"status" binding:"required"`
	}
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

	// REGRA DE BLOQUEIO NA ATUALIZAÇÃO
	if asset.AssetType == "Notebook" && asset.Notebook != nil {
		var count int64
		config.DB.Model(&models.AssetNotebook{}).
			Where("((serial_number = ? AND serial_number != '' AND serial_number != '#N/D') OR (patrimonio = ? AND patrimonio != '' AND patrimonio != '#N/D')) AND asset_id != ?", input.SerialNumber, input.Patrimonio, asset.ID).
			Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe OUTRO Notebook usando esse Serial ou Patrimônio!"})
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
		asset.Starlink.Grupo = input.Grupo
		asset.Starlink.Localizacao = input.Localizacao
		asset.Starlink.Email = input.Email
		asset.Starlink.Senha = input.Senha
		asset.Starlink.SenhaRoteador = input.SenhaRoteador
		asset.Starlink.Responsavel = input.Responsavel
		config.DB.Save(asset.Starlink)
	} else if asset.AssetType == "CHIP" && asset.Chip != nil {
		var count int64
		config.DB.Model(&models.AssetChip{}).
			Where("((numero = ? AND numero != '' AND numero != '#N/D') OR (iccid = ? AND iccid != '' AND iccid != '#N/D')) AND asset_id != ?", input.Numero, input.ICCID, asset.ID).
			Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe OUTRO CHIP usando esse Número ou ICCID!"})
			return
		}
		asset.Chip.ICCID = input.ICCID
		asset.Chip.Numero = input.Numero
		asset.Chip.Plano = input.Plano
		asset.Chip.Grupo = input.Grupo
		asset.Chip.Responsavel = input.Responsavel
		config.DB.Save(asset.Chip)
	} else if asset.AssetType == "Celular" && asset.Celular != nil {
		var count int64
		config.DB.Model(&models.AssetCelular{}).
			Where("imei = ? AND imei != '' AND imei != '#N/D' AND asset_id != ?", input.IMEI, asset.ID).
			Count(&count)
		if count > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Já existe OUTRO Celular usando esse IMEI!"})
			return
		}
		asset.Celular.Modelo = input.ModeloCelular
		asset.Celular.IMEI = input.IMEI
		asset.Celular.Grupo = input.Grupo
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
		tx.Save(&asg)
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
		c.JSON(http.StatusBadRequest, gin.H{"error": "Falha ao ler os dados"})
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

	tx.Model(&asset).Update("status", models.StatusManutencao)

	maintenance := models.AssetMaintenanceLog{
		AssetID:    asset.ID,
		Chamado:    input.Chamado,
		Observacao: input.Observacao,
		CreatedAt:  time.Now(),
	}
	tx.Create(&maintenance)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Enviado para manutenção."})
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

	tx.Model(&asset).Update("status", models.StatusDisponivel)

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
		tx.Create(&mLog)
	} else {
		mLog.Chamado = input.Chamado
		mLog.Observacao = input.Observacao
		tx.Save(&mLog)
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Tratativa atualizada com sucesso!"})
}

func DiscardAsset(c *gin.Context) {
	var input struct {
		Status     string `json:"status"`
		Observacao string `json:"observacao"`
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
		c.JSON(http.StatusForbidden, gin.H{"error": "Remova a atribuição antes de descartar."})
		return
	}

	asset.Status = models.AssetStatus(input.Status)
	asset.Observacao = input.Observacao
	config.DB.Save(&asset)

	c.JSON(http.StatusOK, gin.H{"message": "Ativo atualizado"})
}

func DeleteAsset(c *gin.Context) {
	id := c.Param("id")
	var asset models.Asset
	if err := config.DB.First(&asset, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Ativo não encontrado"})
		return
	}

	config.DB.Where("asset_id = ?", id).Delete(&models.AssetNotebook{})
	config.DB.Where("asset_id = ?", id).Delete(&models.AssetStarlink{})
	config.DB.Where("asset_id = ?", id).Delete(&models.AssetCelular{})
	config.DB.Where("asset_id = ?", id).Delete(&models.AssetChip{})
	config.DB.Where("asset_id = ?", id).Delete(&models.AssetAssignment{})
	config.DB.Where("asset_id = ?", id).Delete(&models.AssetMaintenanceLog{})

	if err := config.DB.Delete(&asset).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "O banco bloqueou a exclusão: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Ativo excluído com sucesso"})
}