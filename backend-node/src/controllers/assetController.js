const { Op } = require('sequelize');
const { sequelize, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular, Employee, AssetAssignment, AuditLog } = require('../../config/db');
const { writeAuditLog } = require('../../utils/audit');
const { standardizeAssetIdentifier, standardizeText } = require('../../utils/sanitizer');

const ASSET_INCLUDES_FULL = [
  { model: AssetNotebook, as: 'Notebook' },
  { model: AssetStarlink, as: 'Starlink' },
  { model: AssetChip, as: 'Chip' },
  { model: AssetCelular, as: 'Celular' },
];

/** YYYY-MM-DD ou DD/MM/AAAA (importação). */
function parseDataAquisicao(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (s.includes('/')) {
    const parts = s.split('/');
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2].slice(0, 4);
      if (/^\d{4}$/.test(y)) return `${y}-${m}-${d}`;
    }
  }
  return null;
}

const normalizeAssetStatus = (raw) => {
  if (!raw) return 'Disponível';
  const s = String(raw).trim().toLowerCase().replace(/\s+/g, ' ');
  const map = {
    disponivel: 'Disponível',
    'disponível': 'Disponível',
    'em uso': 'Em uso',
    emuso: 'Em uso',
    manutencao: 'Manutenção',
    'manutenção': 'Manutenção',
    renovacao: 'Renovação',
    'renovação': 'Renovação',
    renovar: 'Renovação',
    inutilizado: 'Inutilizado',
    descartado: 'Descartado',
    'extraviado/roubado': 'Extraviado/Roubado',
    extraviado: 'Extraviado/Roubado',
    roubado: 'Extraviado/Roubado',
    cancelar: 'Descartado',
    cancelado: 'Descartado',
    bloqueado: 'Manutenção',
  };
  return map[s] || raw;
};

const normalizeAssetType = (raw) => {
  if (!raw) return raw;
  const s = String(raw).trim().toLowerCase();
  const map = {
    notebook: 'Notebook',
    notebooks: 'Notebook',
    celular: 'Celular',
    celulares: 'Celular',
    celulare: 'Celular', // legado do slice(0,-1)
    chip: 'CHIP',
    chips: 'CHIP',
    starlink: 'Starlink',
    starlinks: 'Starlink',
  };
  return map[s] || raw;
};

exports.getAll = async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { model: AssetNotebook, as: 'Notebook' },
        { model: AssetStarlink, as: 'Starlink' },
        { model: AssetChip, as: 'Chip' },
        { model: AssetCelular, as: 'Celular' },
        { model: Employee, as: 'Employee' },
        {
          model: AssetAssignment,
          as: 'AssetAssignments',
          required: false,
          include: [{ model: Employee, as: 'Employee', required: false }],
        },
      ]
    });
    // Normaliza tipos na saída para não quebrar filtros do frontend
    const normalized = assets.map(a => {
      const json = a.toJSON();
      json.asset_type = normalizeAssetType(json.asset_type);
      return json;
    });
    return res.status(200).json({ data: normalized });
  } catch (error) {
    console.error("❌ Erro na listagem de ativos:", error);
    return res.status(500).json({ error: "Erro no servidor: " + error.message });
  }
};

exports.create = async (req, res) => {
  const input = req.body;
  const t = await sequelize.transaction();

  try {
    const assetType = normalizeAssetType(input.asset_type);
    const requestedEmployeeId = input.EmployeeId ?? input.employee_id ?? null;
    const ownerEmployeeId = requestedEmployeeId ? Number(requestedEmployeeId) : null;
    const status = ownerEmployeeId ? 'Em uso' : normalizeAssetStatus(input.status || 'Disponível');

    const patrimonio = standardizeAssetIdentifier(input.patrimonio);
    const serial_number = standardizeAssetIdentifier(input.serial_number);
    const imei = standardizeAssetIdentifier(input.imei);
    const numero = standardizeAssetIdentifier(input.numero);
    const iccid = standardizeAssetIdentifier(input.iccid);

    if (assetType === 'Notebook' && patrimonio) {
      const exists = await AssetNotebook.findOne({ where: { patrimonio }, transaction: t });
      if (exists) {
        await t.rollback();
        return res.status(400).json({ error: `O patrimônio ${patrimonio} já existe.` });
      }
    }
    if (assetType === 'Notebook' && serial_number) {
      const exists = await AssetNotebook.findOne({ where: { serial_number }, transaction: t });
      if (exists) {
        await t.rollback();
        return res.status(400).json({ error: `O serial ${serial_number} já existe.` });
      }
    }

    if (assetType === 'Celular' && imei) {
      const exists = await AssetCelular.findOne({ where: { imei }, transaction: t });
      if (exists) {
        await t.rollback();
        return res.status(400).json({ error: `O IMEI ${imei} já está cadastrado.` });
      }
    }

    const asset = await Asset.create({
      asset_type: assetType,
      status,
      EmployeeId: ownerEmployeeId || null
    }, { transaction: t });

    const dataAquisicaoCreate = parseDataAquisicao(input.data_aquisicao);

    if (assetType === 'Notebook') {
      await AssetNotebook.create({
        AssetId: asset.id,
        serial_number,
        patrimonio,
        modelo: standardizeText(input.modelo_notebook),
        garantia: standardizeText(input.garantia),
        status_garantia: standardizeText(input.status_garantia),
        data_aquisicao: dataAquisicaoCreate,
      }, { transaction: t });
    } 
    else if (assetType === 'Celular') {
      await AssetCelular.create({
        AssetId: asset.id,
        imei,
        modelo: standardizeText(input.modelo_celular),
        grupo: standardizeText(input.grupo),
        responsavel: standardizeText(input.responsavel),
        data_aquisicao: dataAquisicaoCreate,
      }, { transaction: t });
    }
    else if (assetType === 'CHIP') {
      if (numero) {
        const exists = await AssetChip.findOne({ where: { numero }, transaction: t });
        if (exists) {
          await t.rollback();
          return res.status(400).json({ error: `O número ${numero} já está cadastrado.` });
        }
      }
      if (iccid) {
        const exists = await AssetChip.findOne({ where: { iccid }, transaction: t });
        if (exists) {
          await t.rollback();
          return res.status(400).json({ error: `O ICCID ${iccid} já está cadastrado.` });
        }
      }
      await AssetChip.create({
        AssetId: asset.id,
        numero,
        iccid,
        plano: standardizeText(input.plano),
        grupo: standardizeText(input.grupo),
        responsavel: standardizeText(input.responsavel),
        vencimento_plano: input.vencimento_plano,
        data_aquisicao: dataAquisicaoCreate,
      }, { transaction: t });
    }
    else if (assetType === 'Starlink') {
      await AssetStarlink.create({
        AssetId: asset.id,
        modelo: standardizeText(input.modelo_starlink),
        localizacao: standardizeText(input.localizacao),
        projeto: standardizeText(input.projeto),
        grupo: standardizeText(input.grupo),
        responsavel: standardizeText(input.responsavel),
        email_responsavel: input.email_responsavel,
        email: input.email,
        senha: input.senha,
        senha_roteador: input.senha_roteador,
        data_aquisicao: dataAquisicaoCreate,
      }, { transaction: t });
    }

    // Vínculo histórico (quando há dono atual)
    if (ownerEmployeeId) {
      await AssetAssignment.create(
        { EmployeeId: ownerEmployeeId, AssetId: asset.id, assigned_at: new Date(), returned_at: null },
        { transaction: t }
      );
    }

    await writeAuditLog(AuditLog, {
      action: 'CREATE',
      table_name: 'assets',
      record_id: asset.id,
      old_data: null,
      new_data: asset.toJSON(),
      module: 'assets',
      user: req.user?.email || req.user?.nome || null,
      details: `Ativo criado (${assetType})`,
    });

    await t.commit();
    return res.status(201).json({ message: 'Ativo criado com sucesso', data: asset });
  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Erro ao criar ativo:", error);
    return res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const asset = await Asset.findByPk(req.params.id, { transaction: t, include: ASSET_INCLUDES_FULL });
    if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' });

    const oldAsset = asset.toJSON();
    const input = req.body;
    const assetType = normalizeAssetType(asset.asset_type);
    const dataAq = parseDataAquisicao(input.data_aquisicao);

    const patrimonio = standardizeAssetIdentifier(input.patrimonio);
    const serial_number = standardizeAssetIdentifier(input.serial_number);
    const imei = standardizeAssetIdentifier(input.imei);
    const numero = standardizeAssetIdentifier(input.numero);
    const iccid = standardizeAssetIdentifier(input.iccid);

    await asset.update(
      {
        status: input.status != null ? normalizeAssetStatus(input.status) : asset.status,
        observacao: input.observacao ?? asset.observacao,
      },
      { transaction: t }
    );

    if (assetType === 'Notebook') {
      const nb = await AssetNotebook.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (!nb) throw new Error('Detalhe do notebook não encontrado');
      if (patrimonio) {
        const clash = await AssetNotebook.findOne({ where: { patrimonio, AssetId: { [Op.ne]: asset.id } }, transaction: t });
        if (clash) {
          await t.rollback();
          return res.status(400).json({ error: `O patrimônio ${patrimonio} já existe.` });
        }
      }
      if (serial_number) {
        const clash = await AssetNotebook.findOne({ where: { serial_number, AssetId: { [Op.ne]: asset.id } }, transaction: t });
        if (clash) {
          await t.rollback();
          return res.status(400).json({ error: `O serial ${serial_number} já existe.` });
        }
      }
      await nb.update(
        {
          patrimonio,
          serial_number,
          modelo: standardizeText(input.modelo_notebook),
          garantia: standardizeText(input.garantia),
          status_garantia: standardizeText(input.status_garantia),
          data_aquisicao: dataAq,
        },
        { transaction: t }
      );
    } else if (assetType === 'Celular') {
      const cel = await AssetCelular.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (!cel) throw new Error('Detalhe do celular não encontrado');
      if (imei) {
        const clash = await AssetCelular.findOne({ where: { imei, AssetId: { [Op.ne]: asset.id } }, transaction: t });
        if (clash) {
          await t.rollback();
          return res.status(400).json({ error: `O IMEI ${imei} já está cadastrado.` });
        }
      }
      await cel.update(
        {
          imei,
          modelo: standardizeText(input.modelo_celular),
          grupo: standardizeText(input.grupo),
          responsavel: standardizeText(input.responsavel),
          data_aquisicao: dataAq,
        },
        { transaction: t }
      );
    } else if (assetType === 'CHIP') {
      const chip = await AssetChip.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (!chip) throw new Error('Detalhe do CHIP não encontrado');
      if (numero) {
        const clash = await AssetChip.findOne({ where: { numero, AssetId: { [Op.ne]: asset.id } }, transaction: t });
        if (clash) {
          await t.rollback();
          return res.status(400).json({ error: `O número ${numero} já está cadastrado.` });
        }
      }
      if (iccid) {
        const clash = await AssetChip.findOne({ where: { iccid, AssetId: { [Op.ne]: asset.id } }, transaction: t });
        if (clash) {
          await t.rollback();
          return res.status(400).json({ error: `O ICCID ${iccid} já está cadastrado.` });
        }
      }
      await chip.update(
        {
          numero,
          iccid,
          plano: standardizeText(input.plano),
          grupo: standardizeText(input.grupo),
          responsavel: standardizeText(input.responsavel),
          vencimento_plano: input.vencimento_plano || null,
          data_aquisicao: dataAq,
        },
        { transaction: t }
      );
    } else if (assetType === 'Starlink') {
      const st = await AssetStarlink.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (!st) throw new Error('Detalhe do Starlink não encontrado');
      await st.update(
        {
          modelo: standardizeText(input.modelo_starlink),
          localizacao: standardizeText(input.localizacao),
          projeto: standardizeText(input.projeto),
          grupo: standardizeText(input.grupo),
          responsavel: standardizeText(input.responsavel),
          email_responsavel: input.email_responsavel,
          email: input.email,
          senha: input.senha,
          senha_roteador: input.senha_roteador,
          data_aquisicao: dataAq,
        },
        { transaction: t }
      );
    }

    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'assets',
      record_id: asset.id,
      old_data: oldAsset,
      new_data: asset.toJSON(),
      module: 'assets',
      user: req.user?.email || req.user?.nome || null,
      details: 'Ativo atualizado',
    });

    await t.commit();

    const full = await Asset.findByPk(asset.id, { include: ASSET_INCLUDES_FULL });
    const json = full.toJSON();
    json.asset_type = normalizeAssetType(json.asset_type);
    return res.status(200).json({ data: json });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
  }
};

exports.unassign = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const asset = await Asset.findByPk(req.params.id, { transaction: t });
    if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' });

    const activeAssignment = await AssetAssignment.findOne({
      where: { AssetId: asset.id, returned_at: null },
      order: [['assigned_at', 'DESC']],
      transaction: t,
    });

    const oldAsset = asset.toJSON();
    await asset.update({ status: 'Disponível', EmployeeId: null }, { transaction: t });

    if (activeAssignment) {
      await activeAssignment.update({ returned_at: new Date() }, { transaction: t });
    }

    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'assets',
      record_id: asset.id,
      old_data: oldAsset,
      new_data: asset.toJSON(),
      module: 'offboarding',
      user: req.user?.email || req.user?.nome || null,
      details: 'Devolução (unassign) para estoque',
    });

    await t.commit();
    return res.status(200).json({ message: 'Ativo devolvido ao estoque' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
  }
};

exports.maintenance = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const asset = await Asset.findByPk(req.params.id, { transaction: t });
    if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' });

    const oldAsset = asset.toJSON();
    const observacao = req.body?.observacao ? standardizeText(req.body.observacao) : asset.observacao;
    await asset.update({ status: 'Manutenção', observacao }, { transaction: t });

    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'assets',
      record_id: asset.id,
      old_data: oldAsset,
      new_data: asset.toJSON(),
      module: 'maintenance',
      user: req.user?.email || req.user?.nome || null,
      details: `Enviado para manutenção (chamado=${req.body?.chamado || 'N/I'})`,
    });

    await t.commit();
    return res.status(200).json({ message: 'Ativo marcado como Manutenção' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
  }
};

exports.discard = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const asset = await Asset.findByPk(req.params.id, { transaction: t });
    if (!asset) return res.status(404).json({ error: 'Ativo não encontrado' });

    const newStatus = req.body?.status;
    if (!newStatus) return res.status(400).json({ error: 'Status é obrigatório' });
    const observacao = standardizeText(req.body?.observacao || '');
    if (!observacao) return res.status(400).json({ error: 'A justificativa é obrigatória.' });

    // Se vai descartar/inutilizar/extraviar, garante que não está atribuído
    const activeAssignment = await AssetAssignment.findOne({
      where: { AssetId: asset.id, returned_at: null },
      transaction: t,
    });
    if (activeAssignment) {
      await activeAssignment.update({ returned_at: new Date() }, { transaction: t });
    }

    const oldAsset = asset.toJSON();
    await asset.update({ status: newStatus, observacao, EmployeeId: null }, { transaction: t });

    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'assets',
      record_id: asset.id,
      old_data: oldAsset,
      new_data: asset.toJSON(),
      module: 'assets',
      user: req.user?.email || req.user?.nome || null,
      details: `Status alterado para ${newStatus}`,
    });

    await t.commit();
    return res.status(200).json({ message: 'Status atualizado' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
  }
};

exports.importBulk = async (req, res) => {
  const { items } = req.body; 
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Envie um array contendo os ativos a serem importados." });
  }

  const t = await sequelize.transaction();
  let created = 0;
  let skipped = 0;
  const errors = [];

  try {
    for (let idx = 0; idx < items.length; idx++) {
      const input = items[idx];
      try {
        // Em PostgreSQL, uma falha dentro de uma transaction aborta o bloco inteiro.
        // Usamos SAVEPOINT por item (nested transaction) para não perder o lote completo.
        await sequelize.transaction({ transaction: t }, async (tItem) => {
          if (!input || !input.asset_type) {
            skipped++;
            return;
          }

          const assetType = normalizeAssetType(input.asset_type);
          const requestedEmployeeId = input.EmployeeId ?? input.employee_id ?? null;
          const ownerEmployeeId = requestedEmployeeId ? Number(requestedEmployeeId) : null;
          const status =
            input.status != null && String(input.status).trim() !== ''
              ? normalizeAssetStatus(input.status)
              : ownerEmployeeId
                ? 'Em uso'
                : 'Disponível';

          const patrimonio = standardizeAssetIdentifier(input.patrimonio);
          const serial_number = standardizeAssetIdentifier(input.serial_number);
          const imei = standardizeAssetIdentifier(input.imei);
          const numero = standardizeAssetIdentifier(input.numero);
          const iccid = standardizeAssetIdentifier(input.iccid);
          const dataAquisicaoBulk = parseDataAquisicao(input.data_aquisicao);

          // Anti-duplicação por tipo
          if (assetType === 'Notebook') {
            if (patrimonio) {
              const exists = await AssetNotebook.findOne({ where: { patrimonio }, transaction: tItem });
              if (exists) { skipped++; return; }
            }
            if (serial_number) {
              const exists = await AssetNotebook.findOne({ where: { serial_number }, transaction: tItem });
              if (exists) { skipped++; return; }
            }
          }
          if (assetType === 'Celular' && imei) {
            const exists = await AssetCelular.findOne({ where: { imei }, transaction: tItem });
            if (exists) { skipped++; return; }
          }
          if (assetType === 'CHIP') {
            if (numero) {
              const exists = await AssetChip.findOne({ where: { numero }, transaction: tItem });
              if (exists) { skipped++; return; }
            }
            if (iccid) {
              const exists = await AssetChip.findOne({ where: { iccid }, transaction: tItem });
              if (exists) { skipped++; return; }
            }
          }

          const asset = await Asset.create(
            { asset_type: assetType, status, EmployeeId: ownerEmployeeId || null },
            { transaction: tItem }
          );

          if (assetType === 'Notebook') {
            await AssetNotebook.create({
              AssetId: asset.id,
              serial_number,
              patrimonio,
              modelo: standardizeText(input.modelo_notebook),
              garantia: standardizeText(input.garantia),
              status_garantia: standardizeText(input.status_garantia),
              data_aquisicao: dataAquisicaoBulk,
            }, { transaction: tItem });
          } else if (assetType === 'Celular') {
            await AssetCelular.create({
              AssetId: asset.id,
              imei,
              modelo: standardizeText(input.modelo_celular),
              grupo: standardizeText(input.grupo),
              responsavel: standardizeText(input.responsavel),
              data_aquisicao: dataAquisicaoBulk,
            }, { transaction: tItem });
          } else if (assetType === 'CHIP') {
            await AssetChip.create({
              AssetId: asset.id,
              numero,
              iccid,
              plano: standardizeText(input.plano),
              grupo: standardizeText(input.grupo),
              responsavel: standardizeText(input.responsavel),
              vencimento_plano: input.vencimento_plano,
              data_aquisicao: dataAquisicaoBulk,
            }, { transaction: tItem });
          } else if (assetType === 'Starlink') {
            await AssetStarlink.create({
              AssetId: asset.id,
              modelo: standardizeText(input.modelo_starlink),
              localizacao: standardizeText(input.localizacao),
              projeto: standardizeText(input.projeto),
              grupo: standardizeText(input.grupo),
              responsavel: standardizeText(input.responsavel),
              email_responsavel: input.email_responsavel,
              email: input.email,
              senha: input.senha,
              senha_roteador: input.senha_roteador,
              data_aquisicao: dataAquisicaoBulk,
            }, { transaction: tItem });
          }

          // Vínculo histórico (quando há dono atual)
          if (ownerEmployeeId) {
            await AssetAssignment.create(
              { EmployeeId: ownerEmployeeId, AssetId: asset.id, assigned_at: new Date(), returned_at: null },
              { transaction: tItem }
            );
          }

          await writeAuditLog(AuditLog, {
            action: 'IMPORT',
            table_name: 'assets',
            record_id: asset.id,
            old_data: null,
            new_data: asset.toJSON(),
            module: 'import',
            user: req.user?.email || req.user?.nome || null,
            details: `Import bulk (${assetType}) idx=${idx}`,
          });

          created++;
        });
      } catch (e) {
        errors.push({ index: idx, error: e.message || String(e) });
      }
    }

    await t.commit();
    return res.status(201).json({
      message: `Importação concluída! ${created} criados, ${skipped} ignorados, ${errors.length} erros.`,
      created,
      skipped,
      errors
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Erro no processamento em massa:", error);
    return res.status(500).json({ error: "Erro na importação em lote: " + error.message });
  }
};

exports.bulkDelete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ids } = req.body; 
    if (!ids || !ids.length) throw new Error('Nenhum ID fornecido para exclusão.');

    await AssetAssignment.update(
      { returned_at: new Date() },
      { where: { AssetId: ids, returned_at: null }, transaction: t }
    );

    await AssetNotebook.destroy({ where: { AssetId: ids }, transaction: t });
    await AssetCelular.destroy({ where: { AssetId: ids }, transaction: t });
    await AssetChip.destroy({ where: { AssetId: ids }, transaction: t });
    await AssetStarlink.destroy({ where: { AssetId: ids }, transaction: t });

    await Asset.destroy({ where: { id: ids }, transaction: t });
    
    await t.commit();
    return res.status(200).json({ message: `${ids.length} ativos removidos com sucesso.` });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

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