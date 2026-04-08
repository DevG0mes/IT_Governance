/**
 * Valida req.body e retorna { ok, data?, error? }
 */
function validateBody(schema, body) {
  try {
    const data = schema.parse(body);
    return { ok: true, data };
  } catch (e) {
    // Zod pode vir com instâncias diferentes dependendo do runtime/bundle,
    // então além de instanceof, detectamos pelo shape (issues[]).
    const issues = e && typeof e === 'object' && Array.isArray(e.issues) ? e.issues : null;
    if (issues) {
      return {
        ok: false,
        error: issues.map((i) => ({
          path: Array.isArray(i.path) ? i.path.join('.') : '',
          message: i.message || 'Campo inválido',
        })),
      };
    }
    const msg = e && typeof e === 'object' && typeof e.message === 'string' ? e.message : 'Payload inválido';
    const name = e && typeof e === 'object' && typeof e.name === 'string' ? e.name : 'Error';
    return { ok: false, error: [{ path: '', message: `${name}: ${msg}` }] };
  }
}

module.exports = { validateBody };

