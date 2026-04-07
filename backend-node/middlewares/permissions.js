const { User, AccessProfile } = require('../config/db');

function safeParse(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasLevel(level, required) {
  if (required === 'read') return level === 'read' || level === 'edit';
  if (required === 'edit') return level === 'edit';
  return false;
}

async function getEffectivePermissionsJSON(userRow) {
  if (!userRow) return null;
  if (userRow.profile_id) {
    const prof = await AccessProfile.findByPk(userRow.profile_id);
    if (prof?.permissionsJSON) return prof.permissionsJSON;
  }
  return userRow.permissionsJSON;
}

/**
 * Middleware de autorização por módulo/permissão.
 * - Administrator sempre passa
 * - Caso contrário, valida permissões efetivas (perfil → fallback user.permissionsJSON)
 */
function requirePermission(moduleId, requiredLevel = 'read') {
  return async (req, res, next) => {
    try {
      if (req.user?.cargo === 'Administrator') return next();
      const userId = req.user?.user_id;
      if (!userId) return res.status(401).json({ error: 'Token inválido ou expirado' });

      const userRow = await User.findByPk(userId);
      if (!userRow) return res.status(401).json({ error: 'Usuário não encontrado' });

      const raw = await getEffectivePermissionsJSON(userRow);
      const perms = safeParse(raw) || {};
      const level = perms?.[moduleId];
      if (!level || level === 'none') return res.status(403).json({ error: 'Acesso negado.' });
      if (!hasLevel(level, requiredLevel)) return res.status(403).json({ error: 'Acesso negado.' });
      return next();
    } catch (e) {
      return res.status(500).json({ error: 'Erro ao validar permissões' });
    }
  };
}

module.exports = { requirePermission };

