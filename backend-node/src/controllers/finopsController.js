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

    const [assets, catalogItems, licenses, contracts] = await Promise.all([
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

    cache.set(cacheKey, { at: Date.now(), data: snapshot });
    return res.status(200).json({ data: snapshot });
  } catch (error) {
    console.error('❌ FinOps snapshot:', error.message);
    return res.status(500).json({ error: 'Erro ao montar painel FinOps' });
  }
};
