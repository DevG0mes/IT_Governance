const bcrypt = require('bcrypt');
const { User, AccessProfile } = require('../../config/db');

async function permissionsFromProfileId(profileId) {
  if (profileId == null || profileId === '') return null;
  const p = await AccessProfile.findByPk(profileId);
  if (!p || !p.permissionsJSON) return null;
  return typeof p.permissionsJSON === 'string' ? p.permissionsJSON : JSON.stringify(p.permissionsJSON);
}

function pickUserPayload(body, { forUpdate } = {}) {
  const out = {};
  if (body.nome !== undefined) out.nome = String(body.nome).trim();
  if (body.email !== undefined) out.email = String(body.email).trim().toLowerCase();
  if (body.cargo !== undefined) out.cargo = body.cargo;
  const pj = body.permissionsJSON ?? body.permissions_json;
  if (pj !== undefined) out.permissionsJSON = typeof pj === 'string' ? pj : JSON.stringify(pj);
  if (body.profile_id !== undefined) {
    const v = body.profile_id;
    out.profile_id = v === '' || v === null ? null : Number(v);
  }
  if (!forUpdate && body.senha !== undefined) out.senha = body.senha;
  if (forUpdate && body.senha !== undefined && String(body.senha).trim() !== '') out.senha = body.senha;
  return out;
}

exports.getAll = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['senha'] },
      order: [['id', 'ASC']],
    });
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error('❌ Erro ao buscar usuários:', error.message);
    return res.status(500).json({ error: 'Erro ao buscar usuários no banco' });
  }
};

exports.create = async (req, res) => {
  try {
    const input = pickUserPayload(req.body || {}, { forUpdate: false });
    if (!input.nome || !input.email) {
      return res.status(400).json({ error: 'Nome e e-mail são obrigatórios' });
    }
    if (!input.senha) {
      return res.status(400).json({ error: 'Senha é obrigatória' });
    }

    const existing = await User.findOne({ where: { email: input.email } });
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já possui acesso ao sistema.' });
    }

    if (input.profile_id) {
      const prof = await AccessProfile.findByPk(input.profile_id);
      if (!prof) return res.status(400).json({ error: 'Perfil inválido' });
      input.cargo = prof.nome;
      const pj = await permissionsFromProfileId(input.profile_id);
      if (pj) input.permissionsJSON = pj;
    }

    if (!input.permissionsJSON) {
      return res.status(400).json({ error: 'Defina um perfil de acesso ou permissões' });
    }

    input.senha = await bcrypt.hash(input.senha, 14);

    const newUser = await User.create(input);
    const userJSON = newUser.get({ plain: true });
    delete userJSON.senha;
    return res.status(201).json({ data: userJSON });
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
    return res.status(400).json({ error: 'Dados inválidos para cadastro' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const input = pickUserPayload(req.body || {}, { forUpdate: true });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (input.profile_id !== undefined) {
      if (input.profile_id) {
        const prof = await AccessProfile.findByPk(input.profile_id);
        if (!prof) return res.status(400).json({ error: 'Perfil inválido' });
        input.cargo = prof.nome;
        const pj = await permissionsFromProfileId(input.profile_id);
        if (pj) input.permissionsJSON = pj;
      }
    }

    if (input.senha && input.senha.trim() !== '') {
      input.senha = await bcrypt.hash(input.senha, 14);
    } else {
      delete input.senha;
    }

    await user.update(input);
    return res.status(200).json({ message: 'Usuário atualizado com sucesso' });
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao atualizar usuário' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === '1' || id === 1) {
      return res.status(403).json({ error: 'Proibido: O Administrador Root não pode ser removido.' });
    }

    const deleted = await User.destroy({ where: { id } });
    if (deleted === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    return res.status(200).json({ message: 'Usuário removido do sistema' });
  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error.message);
    return res.status(500).json({ error: 'Erro interno ao tentar deletar o usuário' });
  }
};
