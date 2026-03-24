// Arquivo: routes/employees.js
const express = require('express');
const { sequelize, Employee, Asset, AssetAssignment, License, EmployeeLicense } = require('../config/db');
const { standardizeText, standardizeEmail } = require('../utils/sanitizer');

const router = express.Router();

// ==========================================
// 1. LISTAGEM E CADASTRO (QA E ROBUSTEZ)
// ==========================================

router.get('/', async (req, res) => {
  try {
    const employees = await Employee.findAll({ order: [['nome', 'ASC']] });
    res.status(200).json({ data: employees });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar colaboradores' });
  }
});

router.post('/', async (req, res) => {
  try {
    const input = req.body;

    // Padronização (O seu QA de dados do Go)
    input.nome = standardizeText(input.nome);
    input.email = standardizeEmail(input.email);
    input.departamento = standardizeText(input.departamento);

    // Validação de Sanidade
    if (!input.nome || !input.email.includes('@')) {
      return res.status(400).json({ error: 'Dados inválidos: Nome obrigatório e E-mail deve ser válido.' });
    }

    const employee = await Employee.create(input);
    res.status(201).json({ data: employee });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar colaborador no banco' });
  }
});

// ==========================================
// 2. ATRIBUIÇÃO DE ATIVOS (ASSIGN ASSET)
// ==========================================

router.put('/:id/assign', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    const { asset_id } = req.body;

    if (!employee) throw new Error('Colaborador não encontrado');
    if (employee.status === 'Desligado') throw new Error('Não é possível atribuir equipamento a um colaborador desligado');

    const asset = await Asset.findByPk(asset_id, { include: ['Notebook'], transaction: t });
    if (!asset) throw new Error('Equipamento não encontrado');
    if (asset.status !== 'Disponível') throw new Error(`Equipamento não disponível (Status: ${asset.status})`);

    // Atualiza Ativo e Funcionário (Se for Notebook)
    await asset.update({ status: 'Em Uso' }, { transaction: t });
    
    if (asset.asset_type === 'Notebook' && asset.Notebook) {
      await employee.update({ notebook: asset.Notebook.patrimonio }, { transaction: t });
    }

    // Registra a Atribuição (Assignment)
    await AssetAssignment.create({
      EmployeeId: employee.id,
      AssetId: asset.id,
      assigned_at: new Date()
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Equipamento atribuído com sucesso!' });
  } catch (error) {
    await t.rollback();
    res.status(400).json({ error: error.message });
  }
});

// ==========================================
// 3. TOGGLE STATUS / OFFBOARDING (A MÁGICA DO GO)
// ==========================================

router.put('/:id/toggle-status', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');

    if (employee.status === 'Ativo' || !employee.status) {
      const now = new Date();
      
      // 1. Revogar Hardwares automaticamente
      const activeAssignments = await AssetAssignment.findAll({
        where: { EmployeeId: employee.id, returned_at: null },
        transaction: t
      });

      for (let asg of activeAssignments) {
        await asg.update({ returned_at: now }, { transaction: t });
        await Asset.update({ status: 'Disponível' }, { where: { id: asg.AssetId }, transaction: t });
      }

      // 2. Revogar Licenças (Compliance FinOps)
      const empLicenses = await EmployeeLicense.findAll({ where: { EmployeeId: employee.id }, transaction: t });
      for (let el of empLicenses) {
        const lic = await License.findByPk(el.LicenseId, { transaction: t });
        if (lic) {
          await lic.update({ quantidade_em_uso: lic.quantidade_em_uso - 1 }, { transaction: t });
        }
        await el.destroy({ transaction: t });
      }

      await employee.update({ status: 'Desligado', offboarding_date: now, notebook: "" }, { transaction: t });
    } else {
      await employee.update({ status: 'Ativo', offboarding_date: null }, { transaction: t });
    }

    await t.commit();
    res.status(200).json({ message: 'Status atualizado e ativos revogados com sucesso' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

// UpdateOffboarding (Ajuste Select("*").Updates do Go)
router.put('/:id/offboarding', async (req, res) => {
  try {
    await Employee.update({ status: req.body.status }, { where: { id: req.params.id } });
    res.status(200).json({ message: 'Offboarding atualizado com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar no banco de dados' });
  }
});

// DELETE: Remover e retornar ativos ao estoque
router.delete('/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const employee = await Employee.findByPk(req.params.id, { transaction: t });
    if (!employee) throw new Error('Colaborador não encontrado');

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
    res.status(200).json({ message: 'Colaborador removido e ativos retornados ao estoque' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;