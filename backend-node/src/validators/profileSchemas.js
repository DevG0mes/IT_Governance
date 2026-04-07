const { z } = require('zod');

const perm = z.enum(['none', 'read', 'edit']);

const permissionsSchema = z.record(perm);

const profileCreateSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  permissions: permissionsSchema,
});

const profileUpdateSchema = z.object({
  nome: z.string().trim().min(2).max(80).optional(),
  permissions: permissionsSchema.optional(),
});

module.exports = { profileCreateSchema, profileUpdateSchema };

