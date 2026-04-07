const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(6),
});

module.exports = { loginSchema };

