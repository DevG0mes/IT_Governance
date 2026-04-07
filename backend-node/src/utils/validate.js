const { ZodError } = require('zod');

/**
 * Valida req.body e retorna { ok, data?, error? }
 */
function validateBody(schema, body) {
  try {
    const data = schema.parse(body);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof ZodError) {
      return {
        ok: false,
        error: e.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      };
    }
    return { ok: false, error: [{ path: '', message: 'Payload inválido' }] };
  }
}

module.exports = { validateBody };

