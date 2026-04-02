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
  AssetStarlink,
  AuditLog
} = require('../../config/db');
const { standardizeText, standardizeEmail } = require('../../utils/sanitizer');
const { writeAuditLog } = require('../../utils/audit');

exports.getAll = async (req, res) => {
  try {
    const employees = await Employee.findAll({ 
      order: [['nome', 'ASC']],
      include: [
        { 
          model: AssetAssignment, 
          // 🛡️ Tente 'AssetAssignments' (Plural do modelo)
          as: 'AssetAssignments', 
          where: { returned_at: null }, 
          required: false 
        },
        {
          model: EmployeeLicense,
          // 🛡️ Tente 'EmployeeLicenses' (Plural do modelo)
          as: 'EmployeeLicenses',
          required: false
        }
      ]
    });
    return res.status(200).json({ data: employees });
  } catch (error) {
    // Se der erro de "Association not found", o log vai nos dizer o nome certo
    console.error("❌ Erro na consulta de colaboradores:", error.message);
    return res.status(500).json({ error: 'Erro ao carregar lista: ' + error.message });
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

exports.update = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado' });

    // Não permitir setar "Desligado" por aqui: isso tem regras e rota própria.
    const incomingStatus = (req.body?.status || '').trim();
    if (incomingStatus && incomingStatus.toLowerCase() === 'desligado') {
      await t.rollback();
      return res.status(400).json({ error: 'Use /employees/:id/offboarding para finalizar desligamento.' });
    }

    const oldData = employee.toJSON();

    // Campos permitidos (mínimo necessário para o checklist + termo)
    const patch = {};
    if (req.body?.termo_url !== undefined) patch.termo_url = standardizeText(req.body.termo_url);
    if (req.body?.offboarding_onfly !== undefined) patch.offboarding_onfly = Number(req.body.offboarding_onfly) ? 1 : 0;
    if (req.body?.offboarding_mega !== undefined) patch.offboarding_mega = Number(req.body.offboarding_mega) ? 1 : 0;
    if (req.body?.offboarding_adm365 !== undefined) patch.offboarding_adm365 = Number(req.body.offboarding_adm365) ? 1 : 0;
    if (req.body?.offboarding_license !== undefined) patch.offboarding_license = Number(req.body.offboarding_license) ? 1 : 0;

    // Status: permitir "Em desligamento" (fila) ou "Ativo"
    if (incomingStatus) {
      patch.status = incomingStatus;
      if (incomingStatus.toLowerCase() === 'em desligamento') patch.offboarding_date = new Date();
      if (incomingStatus.toLowerCase() === 'ativo') patch.offboarding_date = null;
    }

    await employee.update(patch, { transaction: t });

    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'employees',
      record_id: employee.id,
      old_data: oldData,
      new_data: employee.toJSON(),
      module: 'offboarding',
      user: req.user?.email || req.user?.nome || null,
      details: 'Checklist/termo de offboarding atualizado',
    });

    await t.commit();
    return res.status(200).json({ data: employee });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
  }
};

exports.assignAsset = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const assetIdRaw = req.body.asset_id || req.body.assetId;
    const employeeIdRaw = req.params.id;

    if (!assetIdRaw) throw new Error('ID do Ativo não fornecido');

    const employee = await Employee.findByPk(employeeIdRaw, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');
    if (employee.status === 'Desligado') throw new Error('Não é possível atribuir equipamento a um colaborador desligado');

    const asset = await Asset.findByPk(assetIdRaw, { transaction: t });
    if (!asset) throw new Error('Equipamento não encontrado');
    
    if (asset.status === 'Em uso' && asset.EmployeeId !== employee.id) {
        throw new Error(`Este equipamento já está em uso por outro colaborador.`);
    }

    await asset.update({ status: 'Em uso', EmployeeId: employee.id }, { transaction: t });

    if (asset.asset_type === 'Notebook') {
      const note = await AssetNotebook.findOne({ where: { AssetId: asset.id }, transaction: t });
      if (note) await employee.update({ notebook: note.patrimonio }, { transaction: t });
    } 

    // 🛡️ Gravação explícita compatível com a tabela física 'asset_assignments'
    await AssetAssignment.create({
      EmployeeId: employee.id,
      AssetId: asset.id,
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

    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'employees',
      record_id: employee.id,
      old_data: null,
      new_data: employee.toJSON(),
      module: 'employees',
      user: req.user?.email || req.user?.nome || null,
      details: 'Toggle status colaborador',
    });

    await t.commit();
    return res.status(200).json({ message: 'Status atualizado com sucesso' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

exports.offboarding = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) return res.status(404).json({ error: 'Colaborador não encontrado' });

    const oldData = employee.toJSON();
    const desiredStatus = (req.body?.status || '').trim();

    // Regra de negócio: para finalizar desligamento, checklist + URL do termo assinado é obrigatório.
    if (desiredStatus.toLowerCase() === 'desligado') {
      const okOnfly = Number(employee.offboarding_onfly || 0) === 1;
      const okMega = Number(employee.offboarding_mega || 0) === 1;
      const okAdm365 = Number(employee.offboarding_adm365 || 0) === 1;
      const okEquip = Number(employee.offboarding_license || 0) === 1; // legado: usado como "equipamentos devolvidos"
      const termoUrl = (employee.termo_url || '').trim();

      if (!okOnfly || !okMega || !okAdm365 || !okEquip || !termoUrl) {
        await t.rollback();
        return res.status(400).json({
          error: 'Offboarding incompleto: checklist (Onfly, MegaERP, Admin365, Equipamentos) e URL do termo assinado são obrigatórios.'
        });
      }
    }

    // Segurança: não permite finalizar se ainda houver atribuições ativas
    if (desiredStatus.toLowerCase() === 'desligado') {
      const activeAssignments = await AssetAssignment.count({
        where: { EmployeeId: employee.id, returned_at: null },
        transaction: t
      });
      if (activeAssignments > 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Existem ativos ainda atribuídos ao colaborador. Devolva tudo antes de finalizar.' });
      }
      const activeLicenses = await EmployeeLicense.count({ where: { employee_id: employee.id }, transaction: t });
      if (activeLicenses > 0) {
        await t.rollback();
        return res.status(400).json({ error: 'Existem licenças ainda vinculadas ao colaborador. Revogue todas antes de finalizar.' });
      }
    }

    await employee.update(
      {
        status: desiredStatus || employee.status,
        offboarding_date: desiredStatus ? new Date() : employee.offboarding_date,
      },
      { transaction: t }
    );

    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'employees',
      record_id: employee.id,
      old_data: oldData,
      new_data: employee.toJSON(),
      module: 'offboarding',
      user: req.user?.email || req.user?.nome || null,
      details: `Offboarding status => ${desiredStatus}`,
    });

    await t.commit();
    return res.status(200).json({ message: 'Offboarding atualizado', data: employee });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
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