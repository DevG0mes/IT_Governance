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
    const employees = await Employee.findAll({ 
      order: [['nome', 'ASC']],
      include: [
        { 
          // 🛡️ Traz o contador de Hardwares usando o Alias EXATO do db.js
          model: AssetAssignment, 
          as: 'AssetAssignments', 
          where: { returned_at: null }, // Conta apenas o que ele tem em mãos agora
          required: false // LEFT JOIN: Traz o João mesmo se ele não tiver nada
        },
        {
          // 🛡️ Traz o contador de Softwares
          model: EmployeeLicense,
          as: 'EmployeeLicenses',
          required: false
        }
      ]
    });
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

exports.assignAsset = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { asset_id } = req.body;
    const employee = await Employee.findByPk(req.params.id, { transaction: t });

    if (!employee) throw new Error('Colaborador não encontrado');
    if (employee.status === 'Desligado') throw new Error('Não é possível atribuir equipamento a um colaborador desligado');

    const asset = await Asset.findByPk(asset_id, { transaction: t });

    if (!asset) throw new Error('Equipamento não encontrado');
    if (asset.status !== 'Disponível') throw new Error(`Equipamento não disponível (Status: ${asset.status})`);

    // Atualiza status do Ativo
    await asset.update({ status: 'Em Uso', EmployeeId: employee.id }, { transaction: t });

    // Atualiza campo visual do funcionário de acordo com o tipo
    if (asset.asset_type === 'Notebook') {
      const note = await AssetNotebook.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (note) await employee.update({ notebook: note.patrimonio }, { transaction: t });
    } 

    // 🛡️ Registra a atribuição usando o PascalCase do seu banco de dados
    await AssetAssignment.create({
      EmployeeId: employee.id,
      AssetId: asset.id,
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
      
      // 1. Revoga Hardwares (Usando EmployeeId e AssetId conforme seu DB)
      const activeAssignments = await AssetAssignment.findAll({
        where: { EmployeeId: employee.id, returned_at: null },
        transaction: t
      });

      for (let asg of activeAssignments) {
        await asg.update({ returned_at: now }, { transaction: t });
        await Asset.update({ status: 'Disponível', EmployeeId: null }, { where: { id: asg.AssetId }, transaction: t });
      }

      // 2. Revoga Licenças (Usando employee_id e license_id conforme seu DB)
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
      where: { EmployeeId: employee.id, returned_at: null },
      transaction: t
    });

    for (let asg of activeAssignments) {
      await Asset.update({ status: 'Disponível', EmployeeId: null }, { where: { id: asg.AssetId }, transaction: t });
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

exports.bulkDelete = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { ids } = req.body; 
    if (!ids || !ids.length) throw new Error('Nenhum ID fornecido');

    const activeAssignments = await AssetAssignment.findAll({
      where: { EmployeeId: ids, returned_at: null },
      transaction: t
    });

    for (let asg of activeAssignments) {
      await Asset.update({ status: 'Disponível', EmployeeId: null }, { where: { id: asg.AssetId }, transaction: t });
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