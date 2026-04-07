// Arquivo: middlewares/auth.js
const jwt = require('jsonwebtoken');

// Em produção, exigimos JWT_SECRET. Para não derrubar um ambiente ainda não configurado,
// o fallback só é permitido se `ALLOW_INSECURE_JWT_FALLBACK=true` (explicitamente).
const jwtSecretKey = process.env.JWT_SECRET || "psi_energy_govti_secret_2026";
const isProd = process.env.NODE_ENV === 'production';
const allowInsecureFallback = String(process.env.ALLOW_INSECURE_JWT_FALLBACK || '').toLowerCase() === 'true';
if (isProd && !process.env.JWT_SECRET && !allowInsecureFallback) {
  throw new Error('JWT_SECRET ausente no ambiente de produção. Defina JWT_SECRET ou ALLOW_INSECURE_JWT_FALLBACK=true (não recomendado).');
}
if (isProd && !process.env.JWT_SECRET && allowInsecureFallback) {
  // eslint-disable-next-line no-console
  console.warn('⚠️ JWT_SECRET ausente em produção: usando fallback inseguro porque ALLOW_INSECURE_JWT_FALLBACK=true.');
}

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