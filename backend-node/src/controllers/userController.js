const bcrypt = require('bcrypt');
const { User } = require('../../config/db');

exports.getAll = async (req, res) => {
  try {
    const users = await User.findAll({
      // 🛡️ Segurança: Nunca envia o campo 'senha' para o Frontend
      attributes: ['id', 'nome', 'email', 'cargo', 'permissionsJSON', 'createdAt']
    });
    return res.status(200).json({ data: users });
  } catch (error) {
    console.error("❌ Erro ao buscar usuários:", error.message);
    return res.status(500).json({ error: 'Erro ao buscar usuários no banco' });
  }
};

exports.create = async (req, res) => {
  try {
    const input = req.body;

    // 🛡️ TRAVA ANTI-DUPLICAÇÃO: Checa se o e-mail de admin já existe
    const existing = await User.findOne({ where: { email: input.email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Este e-mail já possui acesso ao sistema.' });
    }

    // BCRYPT COM CUSTO 14 (Segurança Máxima)
    if (input.senha) {
      input.senha = await bcrypt.hash(input.senha, 14);
    }

    const newUser = await User.create(input);

    // Limpa a senha do objeto de resposta
    const userJSON = newUser.get({ plain: true });
    delete userJSON.senha;

    return res.status(201).json({ data: userJSON });

  } catch (error) {
    console.error("❌ Erro ao criar usuário:", error.message);
    return res.status(400).json({ error: 'Dados inválidos para cadastro' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const input = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Se houver nova senha, faz o hash. Se não, remove o campo para não corromper a senha antiga
    if (input.senha && input.senha.trim() !== "") {
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

    // 🛡️ TRAVA DE SEGURANÇA MESTRA: Impede deletar o ID 1 (Root)
    if (id === '1' || id === 1) {
      return res.status(403).json({ error: 'Proibido: O Administrador Root não pode ser removido.' });
    }

    const deleted = await User.destroy({ where: { id } });
    if (deleted === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    return res.status(200).json({ message: 'Usuário removido do sistema' });
  } catch (error) {
    console.error("❌ Erro ao deletar usuário:", error.message);
    return res.status(500).json({ error: 'Erro interno ao tentar deletar o usuário' });
  }
};