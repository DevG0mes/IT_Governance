const { 
  sequelize, 
  Employee, 
  Asset, 
  AssetAssignment, 
  License, 
  EmployeeLicense,
  AssetNotebook,
  AssetCelular,
  AssetChip,
  AssetStarlink
} = require('../../config/db');
const { standardizeText, standardizeEmail } = require('../../utils/sanitizer');

exports.getAll = async (req, res) => {
  try {
    const employees = await Employee.findAll({ order: [['nome', 'ASC']] });
    return res.status(200).json({ data: employees });
  } catch (error) {
    console.error("❌ Erro ao buscar colaboradores:", error.message);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

exports.create = async (req, res) => {
  try {
    let { nome, email, departamento } = req.body;

    nome = standardizeText(nome);
    email = standardizeEmail(email);
    departamento = standardizeText(departamento);

    if (!nome || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'Nome e E-mail válido são obrigatórios.' });
    }

    const existing = await Employee.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: `O e-mail ${email} já pertence ao colaborador ${existing.nome}.` });
    }

    const employee = await Employee.create({ nome, email, departamento });
    return res.status(201).json({ data: employee });
  } catch (error) {
    console.error("❌ Erro ao salvar colaborador:", error.message);
    return res.status(500).json({ error: 'Erro ao salvar colaborador no banco' });
  }
};

// 🌟 ATRIBUIDOR UNIVERSAL DE HARDWARES
exports.assignAsset = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { asset_id } = req.body;
    const employee = await Employee.findByPk(req.params.id, { transaction: t });

    if (!employee) throw new Error('Colaborador não encontrado');
    if (employee.status === 'Desligado') throw new Error('Não é possível atribuir equipamento a um colaborador desligado');

    // 1. Busca o Ativo Genérico primeiro (Serve para Notebook, Celular, Chip, etc)
    const asset = await Asset.findByPk(asset_id, { transaction: t });

    if (!asset) throw new Error('Equipamento não encontrado');
    if (asset.status !== 'Disponível') throw new Error(`Equipamento não disponível (Status: ${asset.status})`);

    // 2. Muda o status para Em Uso
    await asset.update({ status: 'Em Uso' }, { transaction: t });

    // 3. Denormalização (Atalhos visuais para o Dashboard)
    // Se for Notebook, salva o patrimônio na tabela do funcionário
    if (asset.asset_type === 'Notebook') {
      const note = await AssetNotebook.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (note) await employee.update({ notebook: note.patrimonio }, { transaction: t });
    } 
    // Se você tiver uma coluna "celular" no model Employee, já fica pronto:
    else if (asset.asset_type === 'Celular') {
      const cel = await AssetCelular.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (cel && employee.celular !== undefined) {
         await employee.update({ celular: cel.numero }, { transaction: t });
      }
    }

    // 4. Registra no Histórico de Atribuições (O mais importante para Auditoria)
    await AssetAssignment.create({
      employee_id: employee.id,
      asset_id: asset.id,
      assigned_at: new Date()
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ message: `${asset.asset_type} atribuído com sucesso!` });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
  }
};

exports.toggleStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');

    const now = new Date();
    if (employee.status === 'Ativo' || !employee.status) {
      
      // Revogar Hardwares (Notebooks, Celulares, Chips, Starlinks)
      const activeAssignments = await AssetAssignment.findAll({
        where: { employee_id: employee.id, returned_at: null },
        transaction: t
      });

      for (let asg of activeAssignments) {
        await asg.update({ returned_at: now }, { transaction: t });
        await Asset.update({ status: 'Disponível' }, { where: { id: asg.asset_id }, transaction: t });
      }

      // Revogar Licenças de Software
      const empLicenses = await EmployeeLicense.findAll({ where: { employee_id: employee.id }, transaction: t });
      for (let el of empLicenses) {
        const lic = await License.findByPk(el.license_id, { transaction: t });
        if (lic && lic.quantidade_em_uso > 0) {
          await lic.update({ quantidade_em_uso: lic.quantidade_em_uso - 1 }, { transaction: t });
        }
        await el.destroy({ transaction: t });
      }

      await employee.update({ 
        status: 'Desligado', 
        offboarding_date: now, 
        notebook: "" // Limpa o atalho visual
      }, { transaction: t });

    } else {
      await employee.update({ status: 'Ativo', offboarding_date: null }, { transaction: t });
    }

    await t.commit();
    return res.status(200).json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');

    const activeAssignments = await AssetAssignment.findAll({
      where: { employee_id: employee.id, returned_at: null },
      transaction: t
    });

    for (let asg of activeAssignments) {
      await Asset.update({ status: 'Disponível' }, { where: { id: asg.asset_id }, transaction: t });
      await asg.update({ returned_at: new Date() }, { transaction: t });
    }

    await employee.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({ message: 'Colaborador removido e ativos liberados' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

// 🗑️ EXCLUSÃO EM MASSA (Para não travar a Hostinger ao apagar 50 de uma vez)
exports.bulkDelete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ids } = req.body; 
    if (!ids || !ids.length) throw new Error('Nenhum ID fornecido');

    const activeAssignments = await AssetAssignment.findAll({
      where: { employee_id: ids, returned_at: null },
      transaction: t
    });

    for (let asg of activeAssignments) {
      await Asset.update({ status: 'Disponível' }, { where: { id: asg.asset_id }, transaction: t });
      await asg.update({ returned_at: new Date() }, { transaction: t });
    }

    await Employee.destroy({ where: { id: ids }, transaction: t });
    
    await t.commit();
    return res.status(200).json({ message: `${ids.length} colaboradores removidos.` });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};