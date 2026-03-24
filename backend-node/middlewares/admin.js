// Arquivo: middlewares/admin.js

const verificarAdmin = (req, res, next) => {
  // Como o auth.js já rodou, os dados (Claims) já estão em req.user
  if (req.user && req.user.cargo === 'Administrator') {
    next(); 
  } else {
    // Retorno 403 (Forbidden) com a mensagem exata do Go
    return res.status(403).json({ 
      error: 'Acesso Negado: Esta função exige nível de Administrador.' 
    });
  }
};

module.exports = verificarAdmin;