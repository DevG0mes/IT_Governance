const express = require('express');
const router = express.Router();

const { sequelize, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular, Employee } = require('../../config/db');

// ROTA DE LISTAGEM (GET)
router.get('/', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { model: AssetNotebook, as: 'Notebook' },
        { model: AssetStarlink, as: 'Starlink' },
        { model: AssetChip, as: 'Chip' },
        { model: AssetCelular, as: 'Celular' },
        { model: Employee, as: 'employee' } // 🚨 O 'as' tem que ser idêntico ao db.js
      ]
    });
    
    return res.status(200).json({ data: assets });
  } catch (error) {
    console.error("❌ Erro na listagem de ativos:", error);
    return res.status(500).json({ error: "Erro no MySQL: " + error.message });
  }
});

// ROTA DE CRIAÇÃO (POST)
router.post('/', async (req, res) => {
  const input = req.body;
  const t = await sequelize.transaction();

  try {
    const asset = await Asset.create({
      asset_type: input.asset_type,
      status: input.status || 'Disponível'
    }, { transaction: t });

    // Lógica para notebooks
    if (input.asset_type === 'Notebook') {
      await AssetNotebook.create({
        AssetId: asset.id,
        serial_number: input.serial_number,
        patrimonio: input.patrimonio,
        modelo: input.modelo_notebook,
        garantia: input.garantia,
        status_garantia: input.status_garantia
      }, { transaction: t });
    }
    
    // Adicione os outros cases (Starlink, CHIP, etc) se necessário aqui

    await t.commit();

    return res.status(201).json({ 
      message: 'Ativo criado com sucesso',
      data: asset 
    });

  } catch (error) {
    if (t) await t.rollback();
    console.error("Erro ao criar ativo:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;