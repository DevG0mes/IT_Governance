const { 
  sequelize, 
  Employee, 
  Asset, 
  AssetAssignment, 
  License, 
  EmployeeLicense 
} = require('../config/db');
const { standardizeText, standardizeEmail } = require('../utils/sanitizer');

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

    // Padronização e Limpeza
    nome = standardizeText(nome);
    email = standardizeEmail(email);
    departamento = standardizeText(departamento);

    if (!nome || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'Nome e E-mail válido são obrigatórios.' });
    }

    // 🛡️ TRAVA ANTI-DUPLICAÇÃO (O Escudo Anti-Abner)
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

exports.assignAsset = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { asset_id } = req.body;
    const employee = await Employee.findByPk(req.params.id, { transaction: t });

    if (!employee) throw new Error('Colaborador não encontrado');
    if (employee.status === 'Desligado') throw new Error('Não é possível atribuir equipamento a um colaborador desligado');

    const asset = await Asset.findByPk(asset_id, { 
      include: [{ model: Asset, as: 'Notebook' }], 
      transaction: t 
    });

    if (!asset) throw new Error('Equipamento não encontrado');
    if (asset.status !== 'Disponível') throw new Error(`Equipamento não disponível (Status: ${asset.status})`);

    // Atualiza Ativo e Employee (Denormalização para Dashboard)
    await asset.update({ status: 'Em Uso' }, { transaction: t });
    if (asset.asset_type === 'Notebook' && asset.Notebook) {
      await employee.update({ notebook: asset.Notebook.patrimonio }, { transaction: t });
    }

    // 🛡️ Registro no Histórico (Chaves em snake_case para bater com o banco)
    await AssetAssignment.create({
      employee_id: employee.id,
      asset_id: asset.id,
      assigned_at: new Date()
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ message: 'Equipamento atribuído com sucesso!' });
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
      // 1. Revogar Hardwares
      const activeAssignments = await AssetAssignment.findAll({
        where: { employee_id: employee.id, returned_at: null },
        transaction: t
      });

      for (let asg of activeAssignments) {
        await asg.update({ returned_at: now }, { transaction: t });
        await Asset.update({ status: 'Disponível' }, { where: { id: asg.asset_id }, transaction: t });
      }

      // 2. Revogar Licenças (Compliance FinOps)
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
        notebook: "" 
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