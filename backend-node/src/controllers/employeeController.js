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
          model: AssetAssignment, 
          as: 'AssetAssignments', 
          where: { returned_at: null }, 
          required: false 
        },
        {
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

// 🛡️ FUNÇÃO CORRIGIDA E BLINDADA
exports.assignAsset = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // Captura o ID independente de vir como asset_id ou assetId
    const assetIdRaw = req.body.asset_id || req.body.assetId;
    const employeeIdRaw = req.params.id;

    if (!assetIdRaw) throw new Error('ID do Ativo não fornecido');

    const employee = await Employee.findByPk(employeeIdRaw, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');
    if (employee.status === 'Desligado') throw new Error('Não é possível atribuir equipamento a um colaborador desligado');

    const asset = await Asset.findByPk(assetIdRaw, { transaction: t });
    if (!asset) throw new Error('Equipamento não encontrado');
    
    // Se já estiver em uso por outra pessoa, precisamos saber
    if (asset.status === 'Em uso' && asset.EmployeeId !== employee.id) {
        throw new Error(`Este equipamento já está em uso por outro colaborador.`);
    }

    // Atualiza status do Ativo (Usando EmployeeId PascalCase do seu DB)
    await asset.update({ status: 'Em uso', EmployeeId: employee.id }, { transaction: t });

    // Sincroniza campo visual no cadastro do funcionário
    if (asset.asset_type === 'Notebook') {
      const note = await AssetNotebook.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (note) await employee.update({ notebook: note.patrimonio }, { transaction: t });
    } 

    // 🛡️ CRITICAL FIX: Gravação explícita para evitar notNull Violation
    // Passamos tanto o PascalCase quanto o snake_case para garantir que o Sequelize aceite
    await AssetAssignment.create({
      EmployeeId: employee.id,
      AssetId: asset.id,
      employee_id: employee.id, // Fallback para modelos que usam snake_case
      asset_id: asset.id,       // Fallback para modelos que usam snake_case
      assigned_at: new Date(),
      returned_at: null
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ message: `${asset.asset_type} atribuído com sucesso!` });
  } catch (error) {
    if (t) await t.rollback();
    console.error("❌ Erro na atribuição:", error.message);
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
      
      const activeAssignments = await AssetAssignment.findAll({
        where: { EmployeeId: employee.id, returned_at: null },
        transaction: t
      });

      for (let asg of activeAssignments) {
        await asg.update({ returned_at: now }, { transaction: t });
        await Asset.update({ status: 'Disponível', EmployeeId: null }, { where: { id: asg.AssetId }, transaction: t });
      }

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