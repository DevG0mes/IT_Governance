// Arquivo: routes/licenses.js
const express = require('express');
const router = express.Router();
// ✅ AJUSTE DE IMPORTAÇÃO: Centralizado para evitar MODULE_NOT_FOUND
const { 
  sequelize, 
  License, 
  EmployeeLicense, 
  Employee 
} = require('../config/db'); 

// ==========================================
// 1. LISTAGEM (Com Preload/Include)
// ==========================================
router.get('/', async (req, res) => {
  try {
    const licenses = await License.findAll({
      include: [
        {
          model: EmployeeLicense,
          as: 'EmployeeLicenses', // Certifique-se que o alias no db.js é este
          include: [{ model: Employee, as: 'Employee' }]
        }
      ]
    });
    // Retornamos dentro de data: para manter o padrão do seu Frontend
    return res.status(200).json({ data: licenses });
  } catch (error) {
    console.error("❌ Erro na listagem de licenças:", error.message);
    return res.status(500).json({ error: "Erro no banco de dados: " + error.message });
  }
});

// ==========================================
// 2. CADASTRO (CreateLicense)
// ==========================================
router.post('/', async (req, res) => {
  try {
    const input = req.body;
    
    const license = await License.create({
      nome: input.nome,
      fornecedor: input.fornecedor,
      plano: input.plano,
      custo: input.custo,
      quantidade_total: input.quantidade_total,
      quantidade_em_uso: 0,
      data_renovacao: input.data_renovacao
    });

    return res.status(201).json({ 
      message: "Licença criada!",
      data: license 
    });
  } catch (error) {
    console.error("❌ Erro ao cadastrar licença:", error.message);
    return res.status(400).json({ error: "Falha ao criar licença: " + error.message });
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

    // Validação de sanidade: não pode ter menos licenças totais do que as já distribuídas
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

    return res.status(200).json({ message: 'Licença atualizada', data: license });
  } catch (error) {
    return res.status(400).json({ error: error.message });
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
    if (!license) throw new Error('Licença não encontrada');

    // Verifica disponibilidade
    if (license.quantidade_em_uso >= license.quantidade_total) {
      return res.status(400).json({ error: 'Todas as licenças deste plano já estão em uso!' });
    }

    // Evita duplicidade (mesma licença para o mesmo colaborador)
    const existing = await EmployeeLicense.findOne({
      where: { EmployeeId: employee_id, LicenseId: license_id },
      transaction: t
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Este colaborador já possui esta licença atribuída!' });
    }

    // Cria o vínculo
    await EmployeeLicense.create({
      EmployeeId: employee_id,
      LicenseId: license_id,
      assigned_at: new Date()
    }, { transaction: t });

    // Incrementa o contador na tabela de licenças
    await license.update({ 
      quantidade_em_uso: license.quantidade_em_uso + 1 
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ message: 'Licença atribuída com sucesso!' });

  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
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
    if (!empLicense) throw new Error('Vínculo não encontrado');

    const license = await License.findByPk(empLicense.LicenseId, { transaction: t });
    if (license) {
      // Garante que o contador nunca fique negativo
      await license.update({ 
        quantidade_em_uso: Math.max(0, license.quantidade_em_uso - 1) 
      }, { transaction: t });
    }

    await empLicense.destroy({ transaction: t });

    await t.commit();
    return res.status(200).json({ message: 'Licença revogada com sucesso!' });

  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;