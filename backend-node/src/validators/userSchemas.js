const { z } = require('zod');

const userCreateSchema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  senha: z.string().min(6),
  profile_id: z.union([z.number().int().positive(), z.string().trim().min(1)]).optional(),
});

const userUpdateSchema = z.object({
  nome: z.string().trim().min(2).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  senha: z.string().min(6).optional(),
  profile_id: z.union([z.number().int().positive(), z.string().trim().min(1), z.null()]).optional(),
});

module.exports = { userCreateSchema, userUpdateSchema };

