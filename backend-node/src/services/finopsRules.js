/**
 * Regras de negócio FinOps — GovTI (PSI Energy)
 * Fonte de valores de hardware: catálogo (category + nome do modelo/plano).
 * Licenças: custo unitário × quantidade; plano Mensal vs Anual (compromisso mensal).
 */

const MONTHLY = 'mensal';
const YEARLY = 'anual';

function licenseMonthlyCommitment(lic) {
  const q = Math.max(0, Number(lic.quantidade_total) || 0);
  const unit = Number(lic.custo);
  if (!Number.isFinite(unit) || q === 0) return 0;
  const plano = (lic.plano || '').trim().toLowerCase();
  const totalPeriod = unit * q;
  if (plano === YEARLY) return totalPeriod / 12;
  return totalPeriod;
}

function licenseMonthlyUsed(lic) {
  const committed = licenseMonthlyCommitment(lic);
  const q = Math.max(0, Number(lic.quantidade_total) || 0);
  const used = Math.max(0, Number(lic.quantidade_em_uso) || 0);
  if (q === 0) return 0;
  return committed * (used / q);
}

function licenseMonthlyWaste(lic) {
  return Math.max(0, licenseMonthlyCommitment(lic) - licenseMonthlyUsed(lic));
}

function assetTypeToCatalogKey(assetType) {
  const s = String(assetType || '').trim().toLowerCase();
  if (s === 'notebook' || s === 'notebooks') return 'notebook';
  if (s === 'celular' || s === 'celulares') return 'celular';
  if (s === 'chip' || s === 'chips') return 'chip';
  if (s === 'starlink' || s === 'starlinks') return 'starlink';
  return s;
}

function getAssetDetail(asset) {
  const t = assetTypeToCatalogKey(asset.asset_type);
  return (
    asset.Notebook ||
    asset.notebook ||
    (t === 'celular' ? asset.Celular || asset.celular : null) ||
    (t === 'chip' ? asset.Chip || asset.chip : null) ||
    (t === 'starlink' ? asset.Starlink || asset.starlink : null)
  );
}

function getCatalogLookupName(asset) {
  const d = getAssetDetail(asset);
  if (!d) return '';
  const t = assetTypeToCatalogKey(asset.asset_type);
  if (t === 'chip') return (d.plano || '').trim();
  return (d.modelo || '').trim();
}

function findCatalogValor(catalogItems, asset) {
  if (!catalogItems || !catalogItems.length) return null;
  const aType = assetTypeToCatalogKey(asset.asset_type);
  const name = getCatalogLookupName(asset).toLowerCase();
  if (!name) return null;
  const found = catalogItems.find((c) => {
    const cat = (c.category || '').trim().toLowerCase();
    const nome = (c.nome || '').trim().toLowerCase();
    return cat === aType && nome === name;
  });
  if (!found) return null;
  const v = parseFloat(found.valor);
  return Number.isFinite(v) ? v : null;
}

/** Data de aquisição no detalhe do ativo (YYYY-MM-DD). */
function getDataAquisicaoStr(asset) {
  const d = getAssetDetail(asset);
  if (!d || d.data_aquisicao == null || d.data_aquisicao === '') return null;
  const s = d.data_aquisicao;
  if (typeof s === 'string') return s.slice(0, 10);
  if (s instanceof Date) return s.toISOString().slice(0, 10);
  return String(s).slice(0, 10);
}

function calendarMonthsElapsed(startStr, refDate = new Date()) {
  if (!startStr) return null;
  const a = new Date(`${String(startStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(a.getTime())) return null;
  const b = refDate instanceof Date ? refDate : new Date(refDate);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

/** Depreciação linear aproximada: sem data de aquisição assume valor cheio (ainda não deprecia no modelo). */
function residualLinearAproximado(valorCatalogo, dataAquisicaoStr, vidaMeses) {
  if (valorCatalogo == null || !Number.isFinite(valorCatalogo)) return 0;
  if (!dataAquisicaoStr || !vidaMeses || vidaMeses <= 0) return valorCatalogo;
  const months = calendarMonthsElapsed(dataAquisicaoStr);
  if (months === null) return valorCatalogo;
  const frac = Math.min(1, months / vidaMeses);
  return Math.max(0, valorCatalogo * (1 - frac));
}

function isEmUso(asset) {
  return (asset.status || '').trim().toLowerCase() === 'em uso';
}

function isManutencao(asset) {
  const s = (asset.status || '').trim().toLowerCase();
  return s === 'manutenção' || s === 'manutencao';
}

function isParadoEstoque(asset) {
  const statusStr = (asset.status || '').trim().toLowerCase();
  const isAvailable = statusStr === 'disponível' || statusStr === 'disponivel';
  if (!isAvailable) return false;
  const aType = assetTypeToCatalogKey(asset.asset_type);
  if (aType === 'notebook') return true;
  const rawGroup =
    asset.Celular?.grupo ||
    asset.celular?.grupo ||
    asset.Chip?.grupo ||
    asset.chip?.grupo ||
    asset.Starlink?.grupo ||
    asset.starlink?.grupo ||
    '';
  return rawGroup.trim().toLowerCase() === 'estoque';
}

function buildFinopsSnapshot({ assets, catalogItems, licenses, contracts }) {
  const list = Array.isArray(assets) ? assets : [];
  const cats = Array.isArray(catalogItems) ? catalogItems : [];
  const lics = Array.isArray(licenses) ? licenses : [];
  const contr = Array.isArray(contracts) ? contracts : [];

  const vidaMesesDepreciacao = Math.max(
    1,
    parseInt(process.env.FINOPS_DEPRECIATION_MONTHS || '36', 10) || 36
  );

  let hardwareValorTotal = 0;
  let hardwareValorEmUso = 0;
  let hardwareValorParado = 0;
  let hardwareValorManutencao = 0;
  let hardwareValorResidualEstimado = 0;
  let assetsSemCatalogo = 0;
  let ativosCatalogoSemDataAquisicao = 0;
  const investimentoPorModeloMap = new Map();

  const byType = {
    Notebook: { key: 'Notebook', label: 'Notebook', count: 0, valor: 0, emUso: 0, parado: 0, manutencao: 0 },
    Celular: { key: 'Celular', label: 'Celular', count: 0, valor: 0, emUso: 0, parado: 0, manutencao: 0 },
    CHIP: { key: 'CHIP', label: 'CHIP', count: 0, valor: 0, emUso: 0, parado: 0, manutencao: 0 },
    Starlink: { key: 'Starlink', label: 'Starlink', count: 0, valor: 0, emUso: 0, parado: 0, manutencao: 0 },
  };

  const statusCounts = { emUso: 0, parado: 0, manutencao: 0, outros: 0 };

  list.forEach((raw) => {
    const asset = typeof raw.toJSON === 'function' ? raw.toJSON() : raw;
    const at = (asset.asset_type || '').trim();
    const typeKey = ['Notebook', 'Celular', 'CHIP', 'Starlink'].includes(at) ? at : null;
    const valor = findCatalogValor(cats, asset);
    const nomeCatalogo = getCatalogLookupName(asset);

    if (valor == null && nomeCatalogo) assetsSemCatalogo += 1;
    const v = valor != null ? valor : 0;
    hardwareValorTotal += v;

    if (valor != null) {
      const dataStr = getDataAquisicaoStr(asset);
      hardwareValorResidualEstimado += residualLinearAproximado(valor, dataStr, vidaMesesDepreciacao);
      if (!dataStr) ativosCatalogoSemDataAquisicao += 1;
      if (nomeCatalogo) {
        const aggKey = `${at}|${nomeCatalogo}`;
        const prev = investimentoPorModeloMap.get(aggKey) || {
          category: at,
          nomeModelo: nomeCatalogo,
          count: 0,
          valorUnitario: valor,
          investimentoTotal: 0,
        };
        prev.count += 1;
        prev.valorUnitario = valor;
        prev.investimentoTotal += valor;
        investimentoPorModeloMap.set(aggKey, prev);
      }
    }

    if (isEmUso(asset)) {
      hardwareValorEmUso += v;
      statusCounts.emUso += 1;
      if (typeKey && byType[typeKey]) {
        byType[typeKey].count += 1;
        byType[typeKey].valor += v;
        byType[typeKey].emUso += 1;
      }
    } else if (isManutencao(asset)) {
      hardwareValorManutencao += v;
      statusCounts.manutencao += 1;
      if (typeKey && byType[typeKey]) {
        byType[typeKey].count += 1;
        byType[typeKey].valor += v;
        byType[typeKey].manutencao += 1;
      }
    } else if (isParadoEstoque(asset)) {
      hardwareValorParado += v;
      statusCounts.parado += 1;
      if (typeKey && byType[typeKey]) {
        byType[typeKey].count += 1;
        byType[typeKey].valor += v;
        byType[typeKey].parado += 1;
      }
    } else {
      statusCounts.outros += 1;
      if (typeKey && byType[typeKey]) {
        byType[typeKey].count += 1;
        byType[typeKey].valor += v;
      }
    }
  });

  const byTypeChart = Object.values(byType).filter((x) => x.count > 0);

  const statusStackData = [
    { name: 'Em uso', value: statusCounts.emUso, fill: '#10b981' },
    { name: 'Parado / Estoque', value: statusCounts.parado, fill: '#3b82f6' },
    { name: 'Manutenção', value: statusCounts.manutencao, fill: '#eab308' },
    { name: 'Outros', value: statusCounts.outros, fill: '#6b7280' },
  ].filter((d) => d.value > 0);

  let licensesCommittedMonthly = 0;
  let licensesUsedMonthly = 0;
  let licensesWasteMonthly = 0;
  let assignedSeatsTotal = 0;
  let seatsTotal = 0;

  const topWaste = [];

  lics.forEach((raw) => {
    const lic = typeof raw.toJSON === 'function' ? raw.toJSON() : raw;
    const elCount = (lic.EmployeeLicenses || []).length;
    const usoSync = Math.max(Number(lic.quantidade_em_uso) || 0, elCount);
    const licAdj = { ...lic, quantidade_em_uso: usoSync };
    const c = licenseMonthlyCommitment(licAdj);
    const u = licenseMonthlyUsed(licAdj);
    const w = licenseMonthlyWaste(licAdj);
    licensesCommittedMonthly += c;
    licensesUsedMonthly += u;
    licensesWasteMonthly += w;
    assignedSeatsTotal += usoSync;
    seatsTotal += Number(lic.quantidade_total) || 0;
    topWaste.push({
      id: lic.id,
      nome: lic.nome,
      plano: lic.plano,
      fornecedor: lic.fornecedor,
      wasteMonthly: w,
      committedMonthly: c,
      usedMonthly: u,
      quantidade_total: lic.quantidade_total,
      quantidade_em_uso: usoSync,
      pctIdle:
        (Number(lic.quantidade_total) || 0) > 0
          ? 1 - (Number(lic.quantidade_em_uso) || 0) / Number(lic.quantidade_total)
          : 0,
    });
  });

  topWaste.sort((a, b) => b.wasteMonthly - a.wasteMonthly);

  let contractsPrevisto = 0;
  let contractsRealizado = 0;
  contr.forEach((raw) => {
    const c = typeof raw.toJSON === 'function' ? raw.toJSON() : raw;
    contractsPrevisto += parseFloat(c.valor_previsto) || 0;
    contractsRealizado += parseFloat(c.valor_realizado) || 0;
  });

  const investimentoPorModelo = Array.from(investimentoPorModeloMap.values())
    .sort((a, b) => b.investimentoTotal - a.investimentoTotal)
    .slice(0, 24);

  return {
    generatedAt: new Date().toISOString(),
    rulesVersion: 1,
    hardware: {
      valorCatalogoTotal: hardwareValorTotal,
      valorCatalogoEmUso: hardwareValorEmUso,
      valorCatalogoParado: hardwareValorParado,
      valorCatalogoManutencao: hardwareValorManutencao,
      valorResidualEstimado: hardwareValorResidualEstimado,
      investimentoPorModelo,
      depreciacao: {
        mesesVidaUtil: vidaMesesDepreciacao,
        metodo: 'linear',
        env: 'FINOPS_DEPRECIATION_MONTHS',
      },
      assetsSemMatchCatalogo: assetsSemCatalogo,
      ativosComCatalogoSemDataAquisicao: ativosCatalogoSemDataAquisicao,
      nota:
        'Investimento por modelo = soma do valor de catálogo por unidade com o mesmo modelo/plano. Depreciação linear aproximada por ativo (data de aquisição + meses de vida); sem data mantém valor de catálogo no residual.',
    },
    licenses: {
      committedMonthly: licensesCommittedMonthly,
      usedMonthly: licensesUsedMonthly,
      wasteMonthly: licensesWasteMonthly,
      assignedSeats: assignedSeatsTotal,
      totalSeats: seatsTotal,
      idlePctTotal: seatsTotal > 0 ? 1 - assignedSeatsTotal / seatsTotal : 0,
      topWaste: topWaste.slice(0, 8),
      planoLabels: { monthly: MONTHLY, yearly: YEARLY },
    },
    contracts: {
      totalPrevisto: contractsPrevisto,
      totalRealizado: contractsRealizado,
      variance: contractsRealizado - contractsPrevisto,
    },
    charts: {
      byType: byTypeChart,
      statusDistribution: statusStackData,
    },
  };
}

module.exports = {
  buildFinopsSnapshot,
  licenseMonthlyCommitment,
  licenseMonthlyUsed,
  licenseMonthlyWaste,
  findCatalogValor,
  assetTypeToCatalogKey,
  getDataAquisicaoStr,
  residualLinearAproximado,
};
