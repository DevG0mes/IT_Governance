// Arquivo: src/controllers/assetController.js
const { sequelize, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular, Employee, AssetAssignment } = require('../../config/db');

exports.getAll = async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { model: AssetNotebook, as: 'Notebook' },
        { model: AssetStarlink, as: 'Starlink' },
        { model: AssetChip, as: 'Chip' },
        { model: AssetCelular, as: 'Celular' },
        { model: Employee, as: 'Employee' } // 🚨 Com E maiúsculo, conectando perfeitamente ao db.js
      ]
    });
    return res.status(200).json({ data: assets });
  } catch (error) {
    console.error("❌ Erro na listagem de ativos:", error);
    return res.status(500).json({ error: "Erro no servidor: " + error.message });
  }
};

exports.create = async (req, res) => {
  const input = req.body;
  const t = await sequelize.transaction();

  try {
    // 🛡️ Travas Anti-duplicação
    if (input.asset_type === 'Notebook' && input.patrimonio) {
      const exists = await AssetNotebook.findOne({ where: { patrimonio: input.patrimonio }, transaction: t });
      if (exists) {
        await t.rollback();
        return res.status(400).json({ error: `O patrimônio ${input.patrimonio} já existe.` });
      }
    }

    if (input.asset_type === 'Celular' && input.imei) {
      const exists = await AssetCelular.findOne({ where: { imei: input.imei }, transaction: t });
      if (exists) {
        await t.rollback();
        return res.status(400).json({ error: `O IMEI ${input.imei} já está cadastrado.` });
      }
    }

    // Cria o Ativo Genérico
    const asset = await Asset.create({
      asset_type: input.asset_type,
      status: input.status || 'Disponível'
    }, { transaction: t });

    // Cria os Detalhes Específicos
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
    else if (input.asset_type === 'Celular') {
      await AssetCelular.create({
        AssetId: asset.id,
        imei: input.imei,
        modelo: input.modelo_celular,
        grupo: input.grupo,
        responsavel: input.responsavel
      }, { transaction: t });
    }
    else if (input.asset_type === 'CHIP') {
      await AssetChip.create({
        AssetId: asset.id,
        numero: input.numero,
        iccid: input.iccid,
        plano: input.plano,
        grupo: input.grupo,
        responsavel: input.responsavel,
        vencimento_plano: input.vencimento_plano
      }, { transaction: t });
    }
    else if (input.asset_type === 'Starlink') {
      await AssetStarlink.create({
        AssetId: asset.id,
        modelo: input.modelo_starlink,
        localizacao: input.localizacao,
        projeto: input.projeto,
        grupo: input.grupo,
        responsavel: input.responsavel,
        email: input.email,
        senha: input.senha,
        senha_roteador: input.senha_roteador
      }, { transaction: t });
    }

    await t.commit();
    return res.status(201).json({ message: 'Ativo criado com sucesso', data: asset });

  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Erro ao criar ativo:", error);
    return res.status(500).json({ error: error.message });
  }
};

// 🚀 IMPORTAÇÃO EM MASSA (Bulk Create)
exports.importBulk = async (req, res) => {
  const { items } = req.body; 
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Envie um array contendo os ativos a serem importados." });
  }

  const t = await sequelize.transaction();
  let successCount = 0;

  try {
    for (const input of items) {
      if (!input.asset_type) continue; 

      if (input.asset_type === 'Notebook' && input.patrimonio) {
        const exists = await AssetNotebook.findOne({ where: { patrimonio: input.patrimonio }, transaction: t });
        if (exists) continue; // Pula os duplicados sem quebrar a planilha inteira
      }

      const asset = await Asset.create({
        asset_type: input.asset_type,
        status: input.status || 'Disponível'
      }, { transaction: t });

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
      // A mesma lógica se aplica se for importar Celulares ou Starlinks em massa
      
      successCount++;
    }

    await t.commit();
    return res.status(201).json({ message: `Importação concluída! ${successCount} registros criados.` });
  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Erro no processamento em massa:", error);
    return res.status(500).json({ error: "Erro na importação em lote: " + error.message });
  }
};

// 🗑️ EXCLUSÃO EM MASSA (Bulk Delete)
exports.bulkDelete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ids } = req.body; // Espera um array de IDs: [1, 2, 3]
    if (!ids || !ids.length) throw new Error('Nenhum ID fornecido para exclusão.');

    // 1. Limpa o histórico de quem estava usando esses ativos
    await AssetAssignment.update(
      { returned_at: new Date() },
      { where: { AssetId: ids, returned_at: null }, transaction: t }
    );

    // 2. Apaga as tabelas filhas (Notebooks, Celulares) ligadas a esses IDs
    await AssetNotebook.destroy({ where: { AssetId: ids }, transaction: t });
    await AssetCelular.destroy({ where: { AssetId: ids }, transaction: t });
    await AssetChip.destroy({ where: { AssetId: ids }, transaction: t });
    await AssetStarlink.destroy({ where: { AssetId: ids }, transaction: t });

    // 3. Apaga a tabela principal
    await Asset.destroy({ where: { id: ids }, transaction: t });
    
    await t.commit();
    return res.status(200).json({ message: `${ids.length} ativos removidos com sucesso.` });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

// ❌ EXCLUSÃO ÚNICA
exports.delete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const asset = await Asset.findByPk(req.params.id, { transaction: t });
    if (!asset) throw new Error('Ativo não encontrado');

    await AssetAssignment.update(
      { returned_at: new Date() },
      { where: { AssetId: asset.id, returned_at: null }, transaction: t }
    );

    await AssetNotebook.destroy({ where: { AssetId: asset.id }, transaction: t });
    await AssetCelular.destroy({ where: { AssetId: asset.id }, transaction: t });
    await AssetChip.destroy({ where: { AssetId: asset.id }, transaction: t });
    await AssetStarlink.destroy({ where: { AssetId: asset.id }, transaction: t });

    await asset.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({ message: 'Ativo removido com sucesso' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};