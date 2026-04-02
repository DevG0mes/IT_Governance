const safeJson = (value) => {
  if (value === undefined) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: 'unserializable' });
  }
};

/**
 * Registra ação no audit_logs (CREATE/UPDATE/DELETE/IMPORT).
 * Mantém payload simples e resiliente entre dialects.
 */
const writeAuditLog = async (AuditLog, entry) => {
  if (!AuditLog) return null;
  const payload = {
    table_name: entry.table_name || null,
    action: entry.action,
    record_id: entry.record_id || null,
    old_data: safeJson(entry.old_data),
    new_data: safeJson(entry.new_data),
    changed_at: entry.changed_at || new Date(),
    timestamp: entry.timestamp || new Date(),
    user: entry.user || null,
    module: entry.module || null,
    details: entry.details || null,
  };
  return AuditLog.create(payload);
};

module.exports = { writeAuditLog };

