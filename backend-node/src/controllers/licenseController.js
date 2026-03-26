const { 
  sequelize, 
  License, 
  EmployeeLicense, 
  Employee 
} = require('../../config/db');

exports.getAll = async (req, res) => {
  try {
    const licenses = await License.findAll({
      include: [
        {
          model: EmployeeLicense,
          as: 'EmployeeLicenses',
          include: [{ model: Employee, as: 'Employee' }]
        }
      ]
    });
    return res.status(200).json({ data: licenses });
  } catch (error) {
    console.error("❌ Erro na listagem de licenças:", error.message);
    return res.status(500).json({ error: "Erro no banco de dados" });
  }
};

exports.create = async (req, res) => {
  try {
    const input = req.body;

    // 🛡️ TRAVA ANTI-DUPLICAÇÃO: Não permite cadastrar o mesmo software duas vezes
    const existing = await License.findOne({ where: { nome: input.nome.trim() } });
    if (existing) {
      return res.status(400).json({ error: `A licença para '${input.nome}' já existe no catálogo.` });
    }

    const license = await License.create({
      nome: input.nome.trim(),
      fornecedor: input.fornecedor,
      plano: input.plano,
      custo: input.custo,
      quantidade_total: input.quantidade_total,
      quantidade_em_uso: 0,
      data_renovacao: input.data_renovacao
    });

    return res.status(201).json({ message: "Licença criada!", data: license });
  } catch (error) {
    return res.status(400).json({ error: "Falha ao criar licença" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const input = req.body;
    const license = await License.findByPk(id);

    if (!license) return res.status(404).json({ error: 'Licença não encontrada' });

    // 🛡️ TRAVA DE SANIDADE: Não permite reduzir o total abaixo do que já está sendo usado
    if (input.quantidade_total < license.quantidade_em_uso) {
      return res.status(400).json({ 
        error: `Impossível reduzir para ${input.quantidade_total}. Existem ${license.quantidade_em_uso} pessoas usando este software.` 
      });
    }

    await license.update(input);
    return res.status(200).json({ message: 'Licença atualizada', data: license });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

exports.assign = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { employee_id, license_id } = req.body;

    const license = await License.findByPk(license_id, { transaction: t });
    if (!license) throw new Error('Licença não encontrada');

    // 🛡️ TRAVA DE ESTOQUE: Verifica se ainda tem slot disponível
    if (license.quantidade_em_uso >= license.quantidade_total) {
      return res.status(400).json({ error: 'Limite de licenças atingido! Compre mais slots antes de atribuir.' });
    }

    // 🛡️ TRAVA DE DUPLICIDADE: Evita dar a mesma licença duas vezes para a mesma pessoa
    const existing = await EmployeeLicense.findOne({
      where: { employee_id, license_id }, // Chaves em snake_case para o banco
      transaction: t
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Este colaborador já possui esta licença ativa.' });
    }

    await EmployeeLicense.create({
      employee_id,
      license_id,
      assigned_at: new Date()
    }, { transaction: t });

    await license.update({ 
      quantidade_em_uso: license.quantidade_em_uso + 1 
    }, { transaction: t });

    await t.commit();
    return res.status(200).json({ message: 'Licença atribuída com sucesso!' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

exports.unassign = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const empLicense = await EmployeeLicense.findByPk(id, { transaction: t });
    if (!empLicense) throw new Error('Vínculo não encontrado');

    const license = await License.findByPk(empLicense.license_id, { transaction: t });
    if (license) {
      await license.update({ 
        quantidade_em_uso: Math.max(0, license.quantidade_em_uso - 1) 
      }, { transaction: t });
    }

    await empLicense.destroy({ transaction: t });
    await t.commit();
    return res.status(200).json({ message: 'Licença revogada e slot liberado.' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};