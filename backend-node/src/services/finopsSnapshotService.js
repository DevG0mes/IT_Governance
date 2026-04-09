const { FinopsMonthlySnapshot } = require('../../config/db');

function pad2(n) {
  return String(n).padStart(2, '0');
}

function ymNow() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function ymAdd(ym, delta) {
  const [y, m] = String(ym).split('-').map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, 1));
  dt.setUTCMonth(dt.getUTCMonth() + delta);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`;
}

async function ensurePreviousMonthSnapshotBestEffort() {
  try {
    const prevYm = ymAdd(ymNow(), -1);
    const exists = await FinopsMonthlySnapshot.findOne({ where: { ym: prevYm } });
    if (exists) return { ok: true, ym: prevYm, created: false };
    // Não gera automaticamente aqui: o endpoint manual faz a geração com a lógica completa.
    // A criação automática será feita por um job/cron chamando o endpoint.
    return { ok: true, ym: prevYm, created: false, note: 'Snapshot ausente (use endpoint/cron para gerar)' };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

module.exports = { ensurePreviousMonthSnapshotBestEffort };

