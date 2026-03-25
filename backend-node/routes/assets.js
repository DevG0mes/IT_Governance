const express = require('express');
const router = express.Router();
// 🚨 O ERRO ESTAVA AQUI: Precisamos importar todos os modelos usados
const { 
  Asset, 
  AssetNotebook, 
  AssetStarlink, 
  AssetChip, 
  AssetCelular, 
  Employee 
} = require('../Models'); // Verifique se o caminho da pasta Models está correto

// ROTA DE LISTAGEM (GET) - Corrigida para não travar
router.get('/', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { 
          model: AssetNotebook, 
          as: 'notebook',
          attributes: { exclude: ['id'] } // Evita o erro de Unknown Column Notebook.id
        },
        { 
          model: AssetStarlink, 
          as: 'starlink', 
          attributes: { exclude: ['id'] } 
        },
        { 
          model: AssetChip, 
          as: 'chip', 
          attributes: { exclude: ['id'] } 
        },
        { 
          model: AssetCelular, 
          as: 'celular', 
          attributes: { exclude: ['id'] } 
        },
        { 
          model: Employee, 
          as: 'employee' // Agora o Employee está definido no topo, não vai mais dar erro!
        }
      ]
    });
    
    res.json(assets);
  } catch (error) {
    console.error("Erro na listagem de ativos:", error);
    res.status(500).json({ error: "Erro real no MySQL: " + error.message });
  }
});

// ROTA DE CRIAÇÃO (POST) - Ajustada para o ImportModule ler o ID
router.post('/', async (req, res) => {
  const input = req.body;
  const { sequelize } = require('../Models'); // Para a transação
  const t = await sequelize.transaction();

  try {
    const asset = await Asset.create({
      asset_type: input.asset_type,
      status: input.status || 'Disponível'
    }, { transaction: t });

    switch (input.asset_type) {
      case 'Notebook':
        await AssetNotebook.create({
          AssetId: asset.id,
          serial_number: input.serial_number,
          patrimonio: input.patrimonio,
          modelo: input.modelo_notebook,
          garantia: input.garantia,
          status_garantia: input.status_garantia
        }, { transaction: t });
        break;
      // ... (Mantenha os outros cases: Starlink, CHIP, Celular como estavam)
    }

    await t.commit();

    // 🚨 RETORNO ESSENCIAL: O Frontend precisa desse 'data' com o ID
    return res.status(201).json({ 
      message: 'Ativo criado com sucesso',
      data: asset 
    });

  } catch (error) {
    if (t) await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;