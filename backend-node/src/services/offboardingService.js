const { Employee, AssetAssignment, EmployeeLicense } = require('../../config/db');

async function tryFinalizeOffboarding(employeeId, transaction) {
  const employee = await Employee.findByPk(employeeId, { transaction });
  if (!employee) return { finalized: false, reason: 'employee_not_found' };

  const status = String(employee.status || '').trim().toLowerCase();
  if (status !== 'em desligamento' && status !== 'em desligamento' && status !== 'em desligamento') {
    return { finalized: false, reason: 'not_in_offboarding' };
  }

  const okOnfly = Number(employee.offboarding_onfly || 0) === 1;
  const okMega = Number(employee.offboarding_mega || 0) === 1;
  const okAdm365 = Number(employee.offboarding_adm365 || 0) === 1;
  const okEquip = Number(employee.offboarding_license || 0) === 1; // legado: usado como "equipamentos devolvidos"
  const termoUrl = (employee.termo_url || '').trim();

  if (!okOnfly || !okMega || !okAdm365 || !okEquip || !termoUrl) {
    return { finalized: false, reason: 'checklist_incomplete' };
  }

  const activeAssignments = await AssetAssignment.count({
    where: { EmployeeId: employee.id, returned_at: null },
    transaction,
  });
  const activeLicenses = await EmployeeLicense.count({
    where: { employee_id: employee.id },
    transaction,
  });

  if (activeAssignments > 0 || activeLicenses > 0) {
    return { finalized: false, reason: 'pending_assets_or_licenses' };
  }

  await employee.update({ status: 'Desligado' }, { transaction });
  return { finalized: true };
}

module.exports = { tryFinalizeOffboarding };

