const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, AccessProfile } = require('../../config/db');

// 🛡️ GOVERNANÇA: Em produção, exigimos JWT_SECRET. Fallback só com flag explícita.
const jwtSecretKey = process.env.JWT_SECRET || "psi_energy_govti_secret_2026";
const isProd = process.env.NODE_ENV === 'production';
const allowInsecureFallback = String(process.env.ALLOW_INSECURE_JWT_FALLBACK || '').toLowerCase() === 'true';
if (isProd && !process.env.JWT_SECRET && !allowInsecureFallback) {
  throw new Error('JWT_SECRET ausente no ambiente de produção. Defina JWT_SECRET ou ALLOW_INSECURE_JWT_FALLBACK=true (não recomendado).');
}

exports.login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
    }

    // Busca o usuário
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Compara o hash da senha
    const validPassword = await bcrypt.compare(senha, user.senha);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Geração do Token JWT (Padrão 12h)
    const token = jwt.sign(
      { 
        user_id: user.id, 
        email: user.email, 
        cargo: user.cargo 
      },
      jwtSecretKey,
      { expiresIn: '12h' }
    );

    const plain = user.get({ plain: true });
    delete plain.senha;

    let effectivePermissionsJSON = plain.permissionsJSON;
    if (plain.profile_id) {
      const prof = await AccessProfile.findByPk(plain.profile_id);
      if (prof && prof.permissionsJSON) {
        effectivePermissionsJSON =
          typeof prof.permissionsJSON === 'string'
            ? prof.permissionsJSON
            : JSON.stringify(prof.permissionsJSON);
      }
    }
    plain.permissionsJSON = effectivePermissionsJSON;
    plain.permissions_json = effectivePermissionsJSON;

    return res.status(200).json({
      token: token,
      data: plain
    });

  } catch (error) {
    console.error("❌ Erro interno no login:", error.message);
    return res.status(500).json({ error: 'Erro interno no servidor de autenticação' });
  }
};

// 🛡️ SETUP DE EMERGÊNCIA (Isolado no Controller)
exports.setupAdmin = async (req, res) => {
  try {
    // 🚨 AJUSTE: Padronizado para o domínio oficial da empresa (psienergy.com.br)
    const adminEmail = 'admin@psienergy.com.br';
    const adminExists = await User.findOne({ where: { email: adminEmail } });
    
    if (adminExists) {
      return res.status(400).send(`⚠️ O Admin ${adminEmail} já existe!`);
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await User.create({
      nome: 'Administrador Root',
      email: adminEmail,
      senha: hashedPassword,
      cargo: 'Administrator',
      permissionsJSON: JSON.stringify({
        "dashboard":"edit","inventory":"edit","licenses":"edit",
        "contracts":"edit","catalog":"edit","employees":"edit",
        "maintenance":"edit","offboarding":"edit","export":"edit",
        "import":"edit","admin":"edit","settings":"edit"
      })
    });

    res.send('✅ Admin criado com sucesso! Use admin@psienergy.com.br / admin123');
  } catch (error) {
    res.status(500).send('❌ Erro ao criar admin: ' + error.message);
  }
};