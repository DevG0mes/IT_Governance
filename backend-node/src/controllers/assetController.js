const { sequelize, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular, Employee } = require('../config/db');

exports.getAll = async (req, res) => {
  try {
    const assets = await Asset.findAll({
      include: [
        { model: AssetNotebook, as: 'Notebook' },
        { model: AssetStarlink, as: 'Starlink' },
        { model: AssetChip, as: 'Chip' },
        { model: AssetCelular, as: 'Celular' },
        { model: Employee, as: 'employee' }
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
    // 🛡️ TRAVA ANTI-DUPLICAÇÃO (Prevenção por tipo)
    if (input.asset_type === 'Notebook' && input.patrimonio) {
      const exists = await AssetNotebook.findOne({ where: { patrimonio: input.patrimonio } });
      if (exists) {
        await t.rollback();
        return res.status(400).json({ error: `O patrimônio ${input.patrimonio} já existe.` });
      }
    }

    if (input.asset_type === 'Celular' && input.imei) {
      const exists = await AssetCelular.findOne({ where: { imei: input.imei } });
      if (exists) {
        await t.rollback();
        return res.status(400).json({ error: `O IMEI ${input.imei} já está cadastrado.` });
      }
    }

    // Criação do Ativo Base
    const asset = await Asset.create({
      asset_type: input.asset_type,
      status: input.status || 'Disponível'
    }, { transaction: t });

    // Lógica Dinâmica para Sub-tabelas
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