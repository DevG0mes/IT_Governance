const { z } = require('zod');

const perm = z.enum(['none', 'read', 'edit']);

// Zod v4: record exige (keySchema, valueSchema)
const permissionsSchema = z.record(z.string(), perm);

const profileCreateSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  permissions: permissionsSchema,
});

const profileUpdateSchema = z.object({
  nome: z.string().trim().min(2).max(80).optional(),
  permissions: permissionsSchema.optional(),
});

module.exports = { profileCreateSchema, profileUpdateSchema };

