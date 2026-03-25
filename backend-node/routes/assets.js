const express = require('express');
const router = express.Router();

// ✅ A SOLUÇÃO: Importamos tudo do db.js que centraliza os modelos
const { 
  sequelize,
  Asset, 
  AssetNotebook, 
  AssetStarlink, 
  AssetChip, 
  AssetCelular, 
  Employee 
} = require('../config/db'); 

// ROTA DE LISTAGEM (GET)
router.get('/', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { 
          model: AssetNotebook, 
          as: 'Notebook', // 🚨 Use o apelido exato definido no db.js (Maiúsculo)
          attributes: { exclude: ['id'] } 
        },
        { 
          model: AssetStarlink, 
          as: 'Starlink', 
          attributes: { exclude: ['id'] } 
        },
        { 
          model: AssetChip, 
          as: 'Chip', 
          attributes: { exclude: ['id'] } 
        },
        { 
          model: AssetCelular, 
          as: 'Celular', 
          attributes: { exclude: ['id'] } 
        },
        { 
          model: Employee, 
          as: 'employee' 
        }
      ]
    });
    
    res.json(assets);
  } catch (error) {
    console.error("Erro na listagem de ativos:", error);
    res.status(500).json({ error: "Erro no MySQL: " + error.message });
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