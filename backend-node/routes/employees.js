// Arquivo: routes/employees.js
const express = require('express');
const router = express.Router();
// ✅ Importação centralizada (Certifique-se que AssetAssignment está exportado no db.js)
const { 
  sequelize, 
  Employee, 
  Asset, 
  AssetAssignment, 
  License, 
  EmployeeLicense 
} = require('../config/db');
const { standardizeText, standardizeEmail } = require('../utils/sanitizer');

// ==========================================
// 1. LISTAGEM E CADASTRO
// ==========================================

router.get('/', async (req, res) => {
  try {
    const employees = await Employee.findAll({ 
      order: [['nome', 'ASC']],
      // Opcional: incluir ativos atuais na listagem
      include: [{ model: Asset, as: 'Assets', through: { where: { returned_at: null } } }] 
    });
    return res.status(200).json({ data: employees });
  } catch (error) {
    console.error("❌ Erro ao buscar colaboradores:", error.message);
    return res.status(500).json({ error: 'Erro ao buscar colaboradores' });
  }
});

router.post('/', async (req, res) => {
  try {
    const input = req.body;

    // Padronização (O seu QA de dados do Go)
    input.nome = standardizeText(input.nome);
    input.email = standardizeEmail(input.email);
    input.departamento = standardizeText(input.departamento);

    if (!input.nome || !input.email || !input.email.includes('@')) {
      return res.status(400).json({ error: 'Dados inválidos: Nome e E-mail válido são obrigatórios.' });
    }

    const employee = await Employee.create(input);
    return res.status(201).json({ data: employee });
  } catch (error) {
    console.error("❌ Erro ao salvar colaborador:", error.message);
    return res.status(500).json({ error: 'Erro ao salvar colaborador no banco' });
  }
});

// ==========================================
// 2. ATRIBUIÇÃO DE ATIVOS (ASSIGN ASSET)
// ==========================================

router.put('/:id/assign', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { asset_id } = req.body;
    const employee = await Employee.findByPk(req.params.id, { transaction: t });

    if (!employee) throw new Error('Colaborador não encontrado');
    if (employee.status === 'Desligado') throw new Error('Não é possível atribuir equipamento a um colaborador desligado');

    // Busca o ativo e seus detalhes (Notebook, etc)
    const asset = await Asset.findByPk(asset_id, { 
      include: [{ model: Asset, as: 'Notebook' }], // Ajuste conforme seu alias no db.js
      transaction: t 
    });

    if (!asset) throw new Error('Equipamento não encontrado');
    if (asset.status !== 'Disponível') throw new Error(`Equipamento não disponível (Status: ${asset.status})`);

    // Atualiza Ativo
    await asset.update({ status: 'Em Uso' }, { transaction: t });
    
    // Se for Notebook, vincula o patrimônio ao campo rápido do Employee (denormalização para o Dashboard)
    if (asset.asset_type === 'Notebook' && asset.Notebook) {
      await employee.update({ notebook: asset.Notebook.patrimonio }, { transaction: t });
    }

    // Registra a Atribuição no histórico
    await AssetAssignment.create({
      EmployeeId: employee.id,
      AssetId: asset.id,
      assigned_at: new Date()
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ message: 'Equipamento atribuído com sucesso!' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 3. OFFBOARDING (A MÁGICA DO GO: REVOGAÇÃO AUTOMÁTICA)
// ==========================================

router.put('/:id/toggle-status', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');

    if (employee.status === 'Ativo' || !employee.status) {
      const now = new Date();
      
      // 1. Revogar Hardwares (Status -> Disponível)
      const activeAssignments = await AssetAssignment.findAll({
        where: { EmployeeId: employee.id, returned_at: null },
        transaction: t
      });

      for (let asg of activeAssignments) {
        await asg.update({ returned_at: now }, { transaction: t });
        await Asset.update({ status: 'Disponível' }, { where: { id: asg.AssetId }, transaction: t });
      }

      // 2. Revogar Licenças (Compliance FinOps - Libera o "slot")
      const empLicenses = await EmployeeLicense.findAll({ where: { EmployeeId: employee.id }, transaction: t });
      for (let el of empLicenses) {
        const lic = await License.findByPk(el.LicenseId, { transaction: t });
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
      // Reativar colaborador
      await employee.update({ status: 'Ativo', offboarding_date: null }, { transaction: t });
    }

    await t.commit();
    return res.status(200).json({ message: 'Status atualizado e ativos revogados com sucesso' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
});

// DELETE: Remover e garantir retorno de ativos ao estoque
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');

    // Libera ativos antes de deletar o funcionário
    const activeAssignments = await AssetAssignment.findAll({
      where: { EmployeeId: employee.id, returned_at: null },
      transaction: t
    });

    for (let asg of activeAssignments) {
      await Asset.update({ status: 'Disponível' }, { where: { id: asg.AssetId }, transaction: t });
      await asg.update({ returned_at: new Date() }, { transaction: t });
    }

    await employee.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({ message: 'Colaborador removido e ativos retornados ao estoque' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;