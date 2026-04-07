const { AccessProfile, User } = require('../../config/db');

function safeParseJSON(raw) {
  if (raw == null) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizePerm(v) {
  const s = String(v || '').trim().toLowerCase();
  if (s === 'edit') return 'edit';
  if (s === 'read') return 'read';
  if (s === 'none' || s === 'hide' || s === 'ocultar') return 'none';
  return 'none';
}

const KNOWN_MODULES = [
  'dashboard',
  'inventory',
  'employees',
  'contracts',
  'catalog',
  'licenses',
  'maintenance',
  'offboarding',
  'import',
  'export',
  'admin',
  'settings',
];

function normalizePermissions(raw) {
  const obj = safeParseJSON(raw);
  if (!obj || typeof obj !== 'object') return null;
  const out = {};
  KNOWN_MODULES.forEach((m) => {
    if (Object.prototype.hasOwnProperty.call(obj, m)) out[m] = normalizePerm(obj[m]);
  });
  // garante que sempre exista pelo menos as chaves conhecidas (evita "undefined" no frontend)
  KNOWN_MODULES.forEach((m) => {
    if (!out[m]) out[m] = 'none';
  });
  return out;
}

exports.getAll = async (req, res) => {
  try {
    const rows = await AccessProfile.findAll({ order: [['nome', 'ASC']] });
    const data = rows.map((r) => {
      const plain = r.get({ plain: true });
      return {
        ...plain,
        permissions: safeParseJSON(plain.permissionsJSON) || {},
      };
    });
    return res.status(200).json({ data });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao buscar perfis' });
  }
};

exports.create = async (req, res) => {
  try {
    const { nome, permissions } = req.body || {};
    const nomeTrim = String(nome || '').trim();
    if (!nomeTrim) return res.status(400).json({ error: 'Nome do perfil é obrigatório' });

    const normalized = normalizePermissions(permissions);
    if (!normalized) return res.status(400).json({ error: 'Permissões inválidas' });

    const created = await AccessProfile.create({
      nome: nomeTrim,
      permissionsJSON: JSON.stringify(normalized),
      created_at: new Date(),
      updated_at: new Date(),
    });

    return res.status(201).json({
      data: { ...created.get({ plain: true }), permissions: normalized },
    });
  } catch (e) {
    if (String(e?.name || '').includes('SequelizeUniqueConstraint')) {
      return res.status(409).json({ error: 'Já existe um perfil com este nome' });
    }
    return res.status(400).json({ error: 'Erro ao criar perfil' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, permissions } = req.body || {};

    const row = await AccessProfile.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Perfil não encontrado' });

    const patch = {};
    if (nome !== undefined) {
      const nomeTrim = String(nome || '').trim();
      if (!nomeTrim) return res.status(400).json({ error: 'Nome do perfil é obrigatório' });
      patch.nome = nomeTrim;
    }
    if (permissions !== undefined) {
      const normalized = normalizePermissions(permissions);
      if (!normalized) return res.status(400).json({ error: 'Permissões inválidas' });
      patch.permissionsJSON = JSON.stringify(normalized);
    }

    patch.updated_at = new Date();
    await row.update(patch);

    const plain = row.get({ plain: true });

    // Mantém usuários vinculados alinhados ao perfil (cargo + permissões em cópia)
    const pid = Number(id);
    if (patch.permissionsJSON) {
      await User.update({ permissionsJSON: plain.permissionsJSON }, { where: { profile_id: pid } });
    }
    if (patch.nome) {
      await User.update({ cargo: plain.nome }, { where: { profile_id: pid } });
    }

    return res.status(200).json({
      data: { ...plain, permissions: safeParseJSON(plain.permissionsJSON) || {} },
    });
  } catch (e) {
    if (String(e?.name || '').includes('SequelizeUniqueConstraint')) {
      return res.status(409).json({ error: 'Já existe um perfil com este nome' });
    }
    return res.status(400).json({ error: 'Erro ao atualizar perfil' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const row = await AccessProfile.findByPk(id);
    if (!row) return res.status(404).json({ error: 'Perfil não encontrado' });
    await row.destroy();
    return res.status(200).json({ message: 'Perfil removido com sucesso' });
  } catch (e) {
    return res.status(500).json({ error: 'Erro ao remover perfil' });
  }
};

