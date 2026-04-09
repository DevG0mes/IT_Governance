const { 
  sequelize, 
  License, 
  EmployeeLicense, 
  Employee,
  AuditLog,
} = require('../../config/db');
const { tryFinalizeOffboarding } = require('../services/offboardingService');
const { writeAuditLog } = require('../../utils/audit');

exports.getAll = async (req, res) => {
  try {
    const licenses = await License.findAll({
      include: [
        {
          model: EmployeeLicense,
          as: 'EmployeeLicenses',
          required: false,
          include: [{ model: Employee, as: 'Employee', required: false }]
        }
      ],
      order: [['nome', 'ASC']]
    });

    const isConsumptionLicense = (licJson) => {
      const nome = String(licJson?.nome || '').toLowerCase();
      // Itens cobrados por volume (ex.: GB) não possuem vínculo com colaboradores.
      return nome.includes('extra file storage');
    };

    const patch = [];
    const data = licenses.map((l) => {
      const j = l.toJSON();
      const assignments = j.EmployeeLicenses || [];
      const n = assignments.length;
      if (!isConsumptionLicense(j)) {
        if (Number(j.quantidade_em_uso) !== n) {
          patch.push({ id: j.id, n });
        }
        return { ...j, quantidade_em_uso: n };
      }
      // Consumo: preserva quantidade_em_uso (pode representar GB usado) e não sincroniza por vínculos.
      return j;
    });

    if (patch.length) {
      await Promise.all(
        patch.map(({ id, n }) => License.update({ quantidade_em_uso: n }, { where: { id } }))
      );
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error("❌ Erro na listagem de licenças:", error.message);
    return res.status(500).json({ error: "Erro no banco de dados" });
  }
};

exports.create = async (req, res) => {
  try {
    const input = req.body;
    const nome = (input.nome || '').trim();
    if (!nome) {
      return res.status(400).json({ error: 'Nome do software é obrigatório.' });
    }

    const license = await License.create({
      nome,
      fornecedor: input.fornecedor,
      plano: input.plano,
      custo: input.custo != null && input.custo !== '' ? Number(input.custo) : null,
      quantidade_total: input.quantidade_total,
      quantidade_em_uso: 0,
      data_renovacao: input.data_renovacao
    });

    return res.status(201).json({ message: "Licença criada!", data: license });
  } catch (error) {
    console.error('❌ create license:', error.message);
    return res.status(400).json({ error: error.message || 'Falha ao criar licença' });
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
    const employeeId = empLicense.employee_id;

    const license = await License.findByPk(empLicense.license_id, { transaction: t });
    const unit = license && license.custo != null ? Number(license.custo) : null;
    if (license) {
      await license.update({ 
        quantidade_em_uso: Math.max(0, license.quantidade_em_uso - 1) 
      }, { transaction: t });
    }

    await empLicense.destroy({ transaction: t });

    // best-effort: se colaborador está em desligamento e ficou tudo ok, marca como Desligado
    try {
      await tryFinalizeOffboarding(employeeId, t);
    } catch (_) {}

    // Savings: registra economia mensal (unitário) para o mês corrente via audit_logs
    try {
      await writeAuditLog(AuditLog, {
        action: 'UPDATE',
        table_name: 'employee_licenses',
        record_id: Number(id) || null,
        old_data: null,
        new_data: null,
        module: 'licenses',
        user: req.user?.email || req.user?.nome || null,
        details: `Revogação de licença (license_id=${empLicense.license_id}, employee_id=${employeeId})`,
        valor_economizado: Number.isFinite(unit) ? unit : null,
      });
    } catch (_) {}

    await t.commit();
    return res.status(200).json({ message: 'Licença revogada e slot liberado.' });
  } catch (error) {
    if (t) await t.rollback();
    return res.status(500).json({ error: error.message });
  }
};

/** Remove vínculos de colaboradores e depois as licenças (transação única). */
exports.bulkDelete = async (req, res) => {
  const raw = req.body?.ids;
  const ids = Array.isArray(raw)
    ? [...new Set(raw.map((x) => parseInt(x, 10)).filter((n) => !isNaN(n)))]
    : [];
  if (ids.length === 0) {
    return res.status(400).json({ error: 'Informe ao menos um id de licença válido.' });
  }

  const t = await sequelize.transaction();
  try {
    await EmployeeLicense.destroy({ where: { license_id: ids }, transaction: t });
    const deleted = await License.destroy({ where: { id: ids }, transaction: t });

    await t.commit();
    return res.status(200).json({
      message: `${deleted} licença(s) removida(s).`,
      deleted,
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('❌ Erro na exclusão em massa de licenças:', error.message);
    return res.status(500).json({ error: error.message || 'Erro ao excluir licenças' });
  }
};