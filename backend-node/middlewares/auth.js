// Arquivo: middlewares/auth.js
const jwt = require('jsonwebtoken');

// Usamos a mesma chave exata do Go para os tokens continuarem válidos
const jwtSecretKey = process.env.JWT_SECRET || "psi_energy_govti_secret_2026";

const verificarToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // Retorno 401 exato do Go
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // Equivalente ao strings.TrimPrefix(authHeader, "Bearer ")
  const token = authHeader.replace('Bearer ', '').trim();

  try {
    const decoded = jwt.verify(token, jwtSecretKey);
    
    // Opcional do Node, mas excelente: salvamos o usuário na requisição 
    // para não ter que decodificar o token de novo no middleware de Admin!
    req.user = decoded; 
    
    next();
  } catch (error) {
    // Retorno 401 exato do Go
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};

module.exports = verificarToken;