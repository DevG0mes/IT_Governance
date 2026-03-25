// Arquivo: routes/assets.js
const express = require('express');
const { sequelize, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular } = require('../config/db');
const { standardizeAssetIdentifier } = require('../utils/sanitizer');

const router = express.Router();

// GET: Buscar todos os hardwares (Com os relacionamentos / Preload)
router.get('/', async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { model: AssetNotebook, as: 'Notebook' },
        { model: AssetStarlink, as: 'Starlink' },
        { model: AssetChip, as: 'Chip' },
        { model: AssetCelular, as: 'Celular' },
        // Futuramente, você adiciona os includes de MaintenanceLogs e Assignments aqui
      ]
    });
    res.status(200).json({ data: assets });
  } catch (error) {
    // 👇 Mudamos aqui para ver a verdade!
    res.status(500).json({ error: "Erro real do MySQL: " + error.message });
  }
});

// POST: Criar novo hardware (Com Transação / tx.Begin)
router.post('/', async (req, res) => {
  const input = req.body;

  // Padronização dos IDs (Sanitizer)
  input.serial_number = standardizeAssetIdentifier(input.serial_number);
  input.patrimonio = standardizeAssetIdentifier(input.patrimonio);

  // Inicia a Transação (O tx.Begin do Go)
  const t = await sequelize.transaction();

  try {
    // 1. Cria a base do Ativo
    const asset = await Asset.create({
      asset_type: input.asset_type,
      status: input.status || 'Disponível'
    }, { transaction: t });

    // 2. Cria os detalhes baseados no Tipo (O Switch do Go)
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

      case 'Starlink':
        await AssetStarlink.create({
          AssetId: asset.id,
          modelo: input.modelo_starlink,
          grupo: input.grupo,
          localizacao: input.localizacao,
          responsavel: input.responsavel,
          email: input.email,
          senha: input.senha,
          senha_roteador: input.senha_roteador
        }, { transaction: t });
        break;

      case 'CHIP':
        await AssetChip.create({
          AssetId: asset.id,
          numero: input.numero,
          plano: input.plano,
          iccid: input.iccid,
          grupo: input.grupo,
          responsavel: input.responsavel
        }, { transaction: t });
        break;

      case 'Celular':
        await AssetCelular.create({
          AssetId: asset.id,
          imei: input.imei,
          modelo: input.modelo_celular,
          grupo: input.grupo,
          responsavel: input.responsavel
        }, { transaction: t });
        break;
    }

    // Comita a transação se tudo deu certo (O tx.Commit do Go)
    await t.commit();
    res.status(201).json({ data: asset });

  } catch (error) {
    // Cancela tudo se der erro (O tx.Rollback do Go)
    await t.rollback();
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar detalhes do ativo' });
  }
});

// PUT: Atualizar Status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status é obrigatório' });

    await Asset.update({ status }, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Status atualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

// PUT: Atualizar Detalhes (Stub conforme o seu Go)
router.put('/:id/details', async (req, res) => {
  res.status(200).json({ message: `Detalhes atualizados (ID: ${req.params.id})` });
});

// PUT: Desvincular Ativo
router.put('/:id/unassign', async (req, res) => {
  try {
    await Asset.update({ status: 'Disponível' }, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Ativo devolvido' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desvincular ativo' });
  }
});

// PUT: Enviar para Manutenção
router.put('/:id/maintenance', async (req, res) => {
  try {
    await Asset.update({ status: 'Manutenção' }, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Enviado para manutenção' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao enviar para manutenção' });
  }
});

// PUT: Resolver Manutenção
router.put('/:id/resolve-maintenance', async (req, res) => {
  try {
    await Asset.update({ status: 'Disponível' }, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Manutenção finalizada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao finalizar manutenção' });
  }
});

// PUT: Atualizar dados de Manutenção
router.put('/:id/update-maintenance', async (req, res) => {
  res.status(200).json({ message: 'Log atualizado' });
});

// PUT: Descartar Ativo
router.put('/:id/discard', async (req, res) => {
  try {
    await Asset.update({ status: 'Descartado' }, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Ativo descartado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao descartar ativo' });
  }
});

// DELETE: Excluir Ativo
router.delete('/:id', async (req, res) => {
  try {
    await Asset.destroy({ where: { id: req.params.id } });
    res.status(200).json({ message: 'Ativo excluído' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir ativo' });
  }
});

module.exports = router;