/**
 * Backend TS (migração incremental).
 * Por enquanto, este server apenas sobe um endpoint health para validar pipeline TS.
 * A migração vai mover middlewares/rotas gradualmente para cá.
 */
import type { Request, Response } from 'express';
import express from 'express';

const app = express();

app.get('/api/health', (_req: Request, res: Response) =>
  res.json({ status: 'OK', server: 'PSI GovTI (TS scaffold)' })
);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 TS scaffold online na porta ${PORT}`);
});

