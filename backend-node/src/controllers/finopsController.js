const {
  Asset,
  AssetNotebook,
  AssetStarlink,
  AssetChip,
  AssetCelular,
  CatalogItem,
  License,
  EmployeeLicense,
  Contract,
  AuditLog,
  FinopsMonthlySnapshot,
} = require('../../config/db');
const { buildFinopsSnapshot } = require('../services/finopsRules');
const { Op } = require('sequelize');

const CACHE_TTL_MS = 45 * 1000;
const cache = new Map();

function pad2(n) {
  return String(n).padStart(2, '0');
}

function nowYm() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

function clampYm(s) {
  const raw = String(s || '').trim();
  if (/^\d{4}-\d{2}$/.test(raw)) return raw;
  return null;
}

function addMonths(ym, delta) {
  const [y, m] = ym.split('-').map((x) => parseInt(x, 10));
  const dt = new Date(Date.UTC(y, m - 1, 1));
  dt.setUTCMonth(dt.getUTCMonth() + delta);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`;
}

function buildMonthRange(range, refYm) {
  if (range === 'current_month') return [refYm];
  if (range === 'last_6') return Array.from({ length: 6 }, (_, i) => addMonths(refYm, -(5 - i)));
  if (range === 'ytd') {
    const year = refYm.slice(0, 4);
    const last = parseInt(refYm.slice(5, 7), 10);
    return Array.from({ length: last }, (_, i) => `${year}-${pad2(i + 1)}`);
  }
  return [refYm];
}

function ymStartEnd(ym) {
  const [y, m] = String(ym).split('-').map((x) => parseInt(x, 10));
  if (!y || !m) return null;
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

async function sumSavingsForYm(refYm) {
  const w = ymStartEnd(refYm);
  if (!w) return 0;
  const rows = await AuditLog.findAll({
    where: {
      valor_economizado: { [Op.ne]: null },
      timestamp: { [Op.gte]: w.start, [Op.lt]: w.end },
      module: { [Op.in]: ['licenses', 'telecom'] },
    },
    attributes: ['valor_economizado'],
  });
  return (rows || []).reduce((acc, r) => acc + (Number(r.valor_economizado) || 0), 0);
}

async function buildLiveSnapshot({ range, ref, months, filters }) {
  const licenseVendor = String(filters?.licenseVendor || '').trim();
  const licensePlan = String(filters?.licensePlan || '').trim();
  const contractVendor = String(filters?.contractVendor || '').trim();

  const [assets, catalogItems, licenses, contracts, savingsValue] = await Promise.all([
    Asset.findAll({
      include: [
        { model: AssetNotebook, as: 'Notebook' },
        { model: AssetStarlink, as: 'Starlink' },
        { model: AssetChip, as: 'Chip' },
        { model: AssetCelular, as: 'Celular' },
      ],
    }),
    CatalogItem.findAll(),
    License.findAll({
      include: [
        {
          model: EmployeeLicense,
          as: 'EmployeeLicenses',
          required: false,
        },
      ],
    }),
    Contract.findAll({
      where: {
        ...(months?.length ? { mes_competencia: { [Op.in]: months } } : {}),
        ...(contractVendor ? { fornecedor: contractVendor } : {}),
      },
    }),
    sumSavingsForYm(ref),
  ]);

  const licFiltered = (licenses || []).filter((l) => {
    const vend = (l.fornecedor || 'Desconhecido').trim();
    const plan = (l.plano || '—').trim();
    if (licenseVendor && vend !== licenseVendor) return false;
    if (licensePlan && plan !== licensePlan) return false;
    return true;
  });

  const snapshot = buildFinopsSnapshot({
    assets,
    catalogItems,
    licenses: licFiltered,
    contracts,
    meta: { range, ref, months, filters: { licenseVendor, licensePlan, contractVendor } },
  });

  snapshot.savings = {
    month: ref,
    savedMonthly: Number(savingsValue) || 0,
    savedAnnualized: (Number(savingsValue) || 0) * 12,
  };

  return snapshot;
}

exports.getSnapshot = async (req, res) => {
  try {
    const rangeRaw = String(req.query.range || 'current_month').trim().toLowerCase();
    const range = ['current_month', 'last_6', 'ytd'].includes(rangeRaw) ? rangeRaw : 'current_month';
    const ref = clampYm(req.query.ref) || nowYm();

    const licenseVendor = String(req.query.licenseVendor || '').trim();
    const licensePlan = String(req.query.licensePlan || '').trim();
    const contractVendor = String(req.query.contractVendor || '').trim();

    const months = buildMonthRange(range, ref);

    const cacheKey = JSON.stringify({ range, ref, months, licenseVendor, licensePlan, contractVendor });
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return res.status(200).json({ data: cached.data });
    }

    // Para meses passados: preferimos snapshot congelado (imutável) quando existir.
    const isPastRef = range === 'current_month' && ref !== nowYm();
    if (isPastRef) {
      const frozen = await FinopsMonthlySnapshot.findOne({ where: { ym: ref } });
      if (frozen?.data) {
        cache.set(cacheKey, { at: Date.now(), data: frozen.data });
        return res.status(200).json({ data: frozen.data });
      }
    }

    const snapshot = await buildLiveSnapshot({
      range,
      ref,
      months,
      filters: { licenseVendor, licensePlan, contractVendor },
    });

    cache.set(cacheKey, { at: Date.now(), data: snapshot });
    return res.status(200).json({ data: snapshot });
  } catch (error) {
    console.error('❌ FinOps snapshot:', error);
    const details =
      process.env.NODE_ENV && String(process.env.NODE_ENV).toLowerCase() === 'production'
        ? undefined
        : error?.message || String(error);
    return res.status(500).json({ error: 'Erro ao montar painel FinOps', ...(details ? { details } : {}) });
  }
};

exports.listMonthlySnapshots = async (req, res) => {
  try {
    const from = clampYm(req.query.from) || null;
    const to = clampYm(req.query.to) || null;
    const rows = await FinopsMonthlySnapshot.findAll({
      where: {
        ...(from ? { ym: { [Op.gte]: from } } : {}),
        ...(to ? { ym: { [Op.lte]: to } } : {}),
      },
      order: [['ym', 'ASC']],
    });

    const data = (rows || []).map((r) => {
      const j = r.toJSON();
      const snap = j.data || {};
      const lic = snap.licenses || {};
      const con = snap.contracts || {};
      const telSavings = snap.savings || {};
      const telecomCommittedMonthly = snap.telecom?.committedMonthly || 0;
      const fixedMonthly = (Number(lic.committedMonthly) || 0) + (Number(con.totalRealizado) || 0) + (Number(telecomCommittedMonthly) || 0);
      return {
        ym: j.ym,
        generated_at: j.generated_at,
        locked: j.locked,
        totals: {
          licensesCommittedMonthly: Number(lic.committedMonthly) || 0,
          contractsRealizado: Number(con.totalRealizado) || 0,
          telecomCommittedMonthly: Number(telecomCommittedMonthly) || 0,
          fixedMonthly,
          savingsMonthly: Number(telSavings.savedMonthly) || 0,
        },
      };
    });

    return res.status(200).json({ data });
  } catch (error) {
    console.error('❌ listMonthlySnapshots:', error);
    return res.status(500).json({ error: 'Erro ao listar snapshots' });
  }
};

exports.generateMonthlySnapshot = async (req, res) => {
  try {
    const ym = clampYm(req.params.ym);
    if (!ym) return res.status(400).json({ error: 'ym inválido. Use YYYY-MM.' });

    const existing = await FinopsMonthlySnapshot.findOne({ where: { ym } });
    if (existing && existing.locked) {
      return res.status(409).json({ error: 'Snapshot já existe e está travado (locked).' });
    }

    const snapshot = await buildLiveSnapshot({
      range: 'current_month',
      ref: ym,
      months: [ym],
      filters: { licenseVendor: '', licensePlan: '', contractVendor: '' },
    });

    const saved = existing
      ? await existing.update(
          {
            data: snapshot,
            generated_at: new Date(),
            generated_by: req.user?.email || req.user?.nome || null,
            locked: true,
          },
          {}
        )
      : await FinopsMonthlySnapshot.create({
          ym,
          data: snapshot,
          generated_at: new Date(),
          generated_by: req.user?.email || req.user?.nome || null,
          locked: true,
        });

    return res.status(201).json({ data: saved.toJSON() });
  } catch (error) {
    console.error('❌ generateMonthlySnapshot:', error);
    return res.status(500).json({ error: 'Erro ao gerar snapshot mensal', details: error?.message || String(error) });
  }
};
