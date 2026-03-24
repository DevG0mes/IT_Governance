// Arquivo: routes/licenses.js
const express = require('express');
const { sequelize, License, EmployeeLicense, Employee } = require('../config/db');

const router = express.Router();

// ==========================================
// 1. LISTAGEM (Com Preload/Include)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const licenses = await License.findAll({
      // O equivalente ao Preload do Go
      include: [
        {
          model: EmployeeLicense,
          as: 'EmployeeLicenses',
          include: [{ model: Employee, as: 'Employee' }]
        }
      ]
    });
    res.status(200).json({ data: licenses });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar licenças' });
  }
});

// ==========================================
// 2. CADASTRO (CreateLicense)
// ==========================================
router.post('/', async (req, res) => {
  try {
    const input = req.body;
    
    // Mapeamento idêntico ao models.License do Go
    const license = await License.create({
      nome: input.nome,
      fornecedor: input.fornecedor,
      plano: input.plano,
      custo: input.custo,
      quantidade_total: input.quantidade_total,
      quantidade_em_uso: 0,
      data_renovacao: input.data_renovacao
    });

    res.status(201).json({ data: license });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao cadastrar licença. Verifique os campos obrigatórios.' });
  }
});

// ==========================================
// 3. ATUALIZAÇÃO (Com Trava de Quantidade)
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const input = req.body;
    const license = await License.findByPk(id);

    if (!license) {
      return res.status(404).json({ error: 'Licença não encontrada' });
    }

    // Trava de segurança FinOps do seu Go
    if (input.quantidade_total < license.quantidade_em_uso) {
      return res.status(400).json({ 
        error: 'A quantidade total não pode ser menor do que a quantidade que já está em uso!' 
      });
    }

    await license.update({
      nome: input.nome,
      fornecedor: input.fornecedor,
      plano: input.plano,
      custo: input.custo,
      quantidade_total: input.quantidade_total,
      data_renovacao: input.data_renovacao
    });

    res.status(200).json({ message: 'Licença atualizada' });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao atualizar licença' });
  }
});

// ==========================================
// 4. ATRIBUIÇÃO (AssignLicense com Transação)
// ==========================================
router.post('/assign', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { employee_id, license_id } = req.body;

    const license = await License.findByPk(license_id, { transaction: t });
    if (!license) {
      throw new Error('Licença não encontrada');
    }

    // Validação de estoque (Go)
    if (license.quantidade_em_uso >= license.quantidade_total) {
      return res.status(400).json({ error: 'Todas as licenças deste plano já estão em uso!' });
    }

    // Validação de duplicidade (Go)
    const existing = await EmployeeLicense.findOne({
      where: { EmployeeId: employee_id, LicenseId: license_id },
      transaction: t
    });
    if (existing) {
      return res.status(400).json({ error: 'Este colaborador já possui esta licença atribuída!' });
    }

    // Cria o vínculo (Assignment)
    await EmployeeLicense.create({
      EmployeeId: employee_id,
      LicenseId: license_id,
      assigned_at: new Date()
    }, { transaction: t });

    // Atualiza o contador na tabela pai
    await license.update({ 
      quantidade_em_uso: license.quantidade_em_uso + 1 
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Licença atribuída com sucesso!' });

  } catch (error) {
    await t.rollback();
    res.status(error.message === 'Licença não encontrada' ? 404 : 500)
       .json({ error: error.message || 'Erro ao atribuir licença' });
  }
});

// ==========================================
// 5. REVOGAÇÃO (UnassignLicense)
// ==========================================
router.delete('/unassign/:id', async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const assignmentID = req.params.id;

    const empLicense = await EmployeeLicense.findByPk(assignmentID, { transaction: t });
    if (!empLicense) {
      throw new Error('Vínculo não encontrado');
    }

    // Devolve a licença para o estoque
    const license = await License.findByPk(empLicense.LicenseId, { transaction: t });
    if (license) {
      await license.update({ 
        quantidade_em_uso: Math.max(0, license.quantidade_em_uso - 1) 
      }, { transaction: t });
    }

    // Deleta o registro de vínculo
    await empLicense.destroy({ transaction: t });

    await t.commit();
    res.status(200).json({ message: 'Licença revogada com sucesso!' });

  } catch (error) {
    await t.rollback();
    res.status(error.message === 'Vínculo não encontrado' ? 404 : 500)
       .json({ error: error.message });
  }
});

module.exports = router;