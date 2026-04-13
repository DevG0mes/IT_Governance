const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(6),
});

const changePasswordSchema = z.object({
  senha_atual: z.string().min(6),
  senha_nova: z.string().min(8),
});

module.exports = { loginSchema, changePasswordSchema };

