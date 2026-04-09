import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Laptop,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  PieChart,
  Users,
  Zap,
  HardDrive,
  LayoutDashboard,
  Cpu,
  Building,
  Filter,
  Loader2,
  X,
  TrendingUp,
  Package,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RePie,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import api from '../services/api';

const CHART_COLORS = ['#10b981', '#3b82f6', '#eab308', '#a855f7', '#ec4899'];

export default function DashboardModule({ assets, employees, licenses, contracts, catalogItems, formatCurrency, isLoading }) {
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem('dash_view_mode') || 'exec';
    } catch {
      return 'exec';
    }
  });
  const [timeRange, setTimeRange] = useState(() => {
    try {
      return localStorage.getItem('dash_time_range') || 'current_month';
    } catch {
      return 'current_month';
    }
  });

  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [selectedGroupForModal, setSelectedGroupForModal] = useState(null);
  const [filtroFornecedor, setFiltroFornecedor] = useState('Todos');
  const [filtroLicFornecedor, setFiltroLicFornecedor] = useState('Todos');
  const [filtroLicPlano, setFiltroLicPlano] = useState('Todos');
  const [finops, setFinops] = useState(null);
  const [finopsPrev, setFinopsPrev] = useState(null);
  const [finopsLoading, setFinopsLoading] = useState(true);

  const loadFinops = useCallback(async () => {
    setFinopsLoading(true);
    try {
      const params = {
        range: timeRange,
        licenseVendor: filtroLicFornecedor !== 'Todos' ? filtroLicFornecedor : '',
        licensePlan: filtroLicPlano !== 'Todos' ? filtroLicPlano : '',
        contractVendor: filtroFornecedor !== 'Todos' ? filtroFornecedor : '',
      };

      const r = await api.get('/dashboard/finops', { params });
      setFinops(r.data?.data || null);

      // Run Rate: comparação vs mês anterior (somente quando range=current_month)
      try {
        const ref = r.data?.data?.meta?.ref;
        if (timeRange === 'current_month' && typeof ref === 'string' && ref.includes('-')) {
          const [yStr, mStr] = ref.split('-');
          const y = parseInt(yStr, 10);
          const m = parseInt(mStr, 10);
          if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
            const prevYm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
            const prev = await api.get('/dashboard/finops', { params: { ...params, range: 'current_month', ref: prevYm } });
            setFinopsPrev(prev.data?.data || null);
          } else {
            setFinopsPrev(null);
          }
        } else {
          setFinopsPrev(null);
        }
      } catch {
        setFinopsPrev(null);
      }
    } catch {
      setFinops(null);
      setFinopsPrev(null);
    } finally {
      setFinopsLoading(false);
    }
  }, [timeRange, filtroLicFornecedor, filtroLicPlano, filtroFornecedor]);

  useEffect(() => {
    loadFinops();
  }, [loadFinops]);

  useEffect(() => {
    if (!isLoading) loadFinops();
  }, [isLoading, loadFinops]);

  useEffect(() => {
    try {
      localStorage.setItem('dash_view_mode', viewMode);
      localStorage.setItem('dash_time_range', timeRange);
    } catch {}
  }, [viewMode, timeRange]);

  const ativosFiltrados = useMemo(() => {
    if (!assets) return [];
    if (filtroAtivo === 'Todos') return assets;

    const target = filtroAtivo.trim().toLowerCase();
    return assets.filter((a) => {
      const typeMatch = (a.asset_type || '').trim().toLowerCase() === target;

      if (target === 'notebook') return typeMatch && !!a.notebook;
      if (target === 'celular') return typeMatch && !!a.celular;
      if (target === 'chip') return typeMatch && !!a.chip;
      if (target === 'starlink') return typeMatch && !!a.starlink;

      return typeMatch;
    });
  }, [assets, filtroAtivo]);

  const stats = useMemo(() => {
    const totalAssets = ativosFiltrados.length;

    const activeAssets = ativosFiltrados.filter(
      (a) => (a.status || '').trim().toLowerCase() === 'em uso'
    ).length;

    const availableAssets = ativosFiltrados.filter((a) => {
      const statusStr = (a.status || '').trim().toLowerCase();
      const isAvailable = statusStr === 'disponível' || statusStr === 'disponivel';
      const aType = (a.asset_type || '').trim().toLowerCase();

      if (aType === 'notebook') return isAvailable;

      const rawGroup = a.celular?.grupo || a.chip?.grupo || a.starlink?.grupo || '';
      return isAvailable && rawGroup.trim().toLowerCase() === 'estoque';
    }).length;

    const maintenanceAssets = ativosFiltrados.filter(
      (a) =>
        (a.status || '').trim().toLowerCase() === 'manutenção' ||
        (a.status || '').trim().toLowerCase() === 'manutencao'
    ).length;

    const expiringChips = ativosFiltrados.filter(
      (a) =>
        (a.asset_type || '').trim().toLowerCase() === 'chip' &&
        ((a.status || '').trim().toLowerCase() === 'renovação' ||
          (a.status || '').trim().toLowerCase() === 'renovacao')
    ).length;

    const totalEmployees = employees ? employees.length : 0;
    const activeEmployees = employees
      ? employees.filter((e) => (e.status || '').trim().toLowerCase() !== 'desligado').length
      : 0;

    const activeLicensesCount = licenses
      ? licenses.reduce((acc, lic) => {
          const el = lic.EmployeeLicenses || lic.assignments || [];
          return acc + (Array.isArray(el) ? el.length : 0);
        }, 0)
      : 0;

    let monthlyLicenseCost = 0;
    if (licenses) {
      // Coerente com fatura: custo é mensal por seat (mesmo quando plano é "Anual (12x)").
      licenses.forEach((lic) => {
        const q = Math.max(0, Number(lic.quantidade_total) || 0);
        const unit = Number(lic.custo);
        if (!Number.isFinite(unit) || q === 0) return;
        monthlyLicenseCost += unit * q;
      });
    }

    return {
      totalAssets,
      activeAssets,
      availableAssets,
      maintenanceAssets,
      expiringChips,
      totalEmployees,
      activeEmployees,
      activeLicensesCount,
      monthlyLicenseCost,
    };
  }, [ativosFiltrados, employees, licenses]);

  const groupStats = useMemo(() => {
    const groups = {};
    if (assets) {
      assets.forEach((a) => {
        const groupName = a.celular?.grupo || a.chip?.grupo || a.starlink?.grupo;
        if (groupName && groupName.trim() !== '' && groupName.toUpperCase() !== 'N/A') {
          if (!groups[groupName]) groups[groupName] = { total: 0, celular: 0, chip: 0, starlink: 0 };

          groups[groupName].total += 1;
          const aType = (a.asset_type || '').trim().toLowerCase();

          if (aType === 'celular' && a.celular) groups[groupName].celular += 1;
          if (aType === 'chip' && a.chip) groups[groupName].chip += 1;
          if (aType === 'starlink' && a.starlink) groups[groupName].starlink += 1;
        }
      });
    }
    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [assets]);

  const assetsInSelectedGroup = useMemo(() => {
    if (!selectedGroupForModal || !assets) return [];
    return assets.filter((a) => {
      const rawGroup = a.celular?.grupo || a.chip?.grupo || a.starlink?.grupo || '';
      return rawGroup.trim() === selectedGroupForModal;
    });
  }, [assets, selectedGroupForModal]);

  const fornecedoresUnicos = useMemo(() => {
    if (!contracts) return ['Todos'];
    const list = contracts.map((c) => (c.fornecedor || 'Desconhecido').trim()).filter(Boolean);
    return ['Todos', ...new Set(list)].sort();
  }, [contracts]);

  const licFornecedoresUnicos = useMemo(() => {
    const list = (licenses || [])
      .map((l) => (l.fornecedor || 'Desconhecido').trim())
      .filter(Boolean);
    return ['Todos', ...new Set(list)].sort();
  }, [licenses]);

  const licPlanosUnicos = useMemo(() => {
    const list = (licenses || []).map((l) => (l.plano || '—').trim()).filter(Boolean);
    return ['Todos', ...new Set(list)].sort();
  }, [licenses]);

  const licensesFiltered = useMemo(() => {
    let list = Array.isArray(licenses) ? licenses : [];
    if (filtroLicFornecedor !== 'Todos') {
      list = list.filter((l) => (l.fornecedor || 'Desconhecido').trim() === filtroLicFornecedor);
    }
    if (filtroLicPlano !== 'Todos') {
      list = list.filter((l) => (l.plano || '—').trim() === filtroLicPlano);
    }
    return list;
  }, [licenses, filtroLicFornecedor, filtroLicPlano]);

  const licensesFinopsCards = useMemo(() => {
    const list = licensesFiltered;
    let committed = 0;
    let used = 0;
    let waste = 0;
    let seatsTotal = 0;
    let seatsUsed = 0;

    list.forEach((lic) => {
      const q = Math.max(0, Number(lic.quantidade_total) || 0);
      const u = Math.max(0, Number(lic.quantidade_em_uso) || 0);
      const unit = Number(lic.custo);
      if (!Number.isFinite(unit) || q === 0) return;
      committed += unit * q;
      used += unit * Math.min(u, q);
      waste += unit * Math.max(0, q - Math.min(u, q));
      seatsTotal += q;
      seatsUsed += Math.min(u, q);
    });

    return {
      committed,
      used,
      waste,
      seatsTotal,
      seatsUsed,
      idlePct: seatsTotal > 0 ? 1 - seatsUsed / seatsTotal : 0,
    };
  }, [licensesFiltered]);

  const contractChartData = useMemo(() => {
    if (finops?.contracts?.monthlySeries?.length) {
      return finops.contracts.monthlySeries.map((x) => ({
        name: x.ym,
        Previsto: x.previsto,
        Realizado: x.realizado,
      }));
    }
    // Fallback local (caso API falhe)
    const dataMap = {};
    if (contracts) {
      let dadosFiltrados = contracts;
      if (filtroFornecedor !== 'Todos') {
        dadosFiltrados = dadosFiltrados.filter(
          (c) => (c.fornecedor || 'Desconhecido').trim() === filtroFornecedor
        );
      }
      dadosFiltrados.forEach((c) => {
        if (!dataMap[c.mes_competencia])
          dataMap[c.mes_competencia] = { name: c.mes_competencia, Previsto: 0, Realizado: 0 };
        dataMap[c.mes_competencia].Previsto += parseFloat(c.valor_previsto || 0);
        dataMap[c.mes_competencia].Realizado += parseFloat(c.valor_realizado || 0);
      });
    }
    return Object.values(dataMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [finops, contracts, filtroFornecedor]);

  const valuationTotal = useMemo(() => {
    let total = 0;
    ativosFiltrados.forEach((a) => {
      const aType = (a.asset_type || '').trim().toLowerCase();
      let catModel = '';

      if (aType === 'notebook' && a.notebook) catModel = a.notebook.modelo;
      else if (aType === 'celular' && a.celular) catModel = a.celular.modelo;
      else if (aType === 'starlink' && a.starlink) catModel = a.starlink.modelo;
      else if (aType === 'chip' && a.chip) catModel = a.chip.plano;

      const targetModel = (catModel || '').trim().toLowerCase();

      const mappedCatalog = (catalogItems || []).find(
        (c) =>
          (c.category || '').trim().toLowerCase() === aType &&
          (c.nome || '').trim().toLowerCase() === targetModel
      );
      if (mappedCatalog) total += parseFloat(mappedCatalog.valor || 0);
    });
    return total;
  }, [ativosFiltrados, catalogItems]);

  const finopsCommitted = finops?.licenses?.committedMonthly ?? stats.monthlyLicenseCost;
  const finopsWaste = finops?.licenses?.wasteMonthly;
  const finopsHwTotal = finops?.hardware?.valorCatalogoTotal;
  const finopsHwEmUso = finops?.hardware?.valorCatalogoEmUso;
  const finopsHwParado = finops?.hardware?.valorCatalogoParado;
  const contractVariance = finops?.contracts?.variance;

  const runRate = useMemo(() => {
    if (!finops?.licenses || !finops?.contracts) return null;
    const lic = Number(finops.licenses.committedMonthly) || 0;
    const con = Number(finops.contracts.totalRealizado) || 0;
    return (lic + con) * 12;
  }, [finops]);

  const runRatePrev = useMemo(() => {
    if (!finopsPrev?.licenses || !finopsPrev?.contracts) return null;
    const lic = Number(finopsPrev.licenses.committedMonthly) || 0;
    const con = Number(finopsPrev.contracts.totalRealizado) || 0;
    return (lic + con) * 12;
  }, [finopsPrev]);

  const runRateDelta = useMemo(() => {
    if (runRate == null || runRatePrev == null) return null;
    return runRate - runRatePrev;
  }, [runRate, runRatePrev]);

  const byTypeChartData = useMemo(() => {
    if (!finops?.charts?.byType?.length) return [];
    return finops.charts.byType.map((x) => ({
      name: x.label,
      valor: x.valor,
      qtd: x.count,
    }));
  }, [finops]);

  const statusPieData = finops?.charts?.statusDistribution || [];

  const showFinopsCharts = !finopsLoading && finops && filtroAtivo === 'Todos';

  const licenseSeriesChartData = useMemo(() => {
    const s = finops?.licenses?.series;
    if (!Array.isArray(s) || s.length === 0) return [];
    return s.map((x) => ({
      name: x.ym,
      Compromisso: x.committedMonthly,
      Usado: x.usedMonthly,
      Ocioso: x.wasteMonthly,
    }));
  }, [finops]);

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      {(isLoading || finopsLoading) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm rounded-3xl min-h-[600px]">
          <Loader2 className="w-16 h-16 text-brandGreen animate-spin mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-brandGreen font-bold animate-pulse tracking-widest uppercase text-sm">
            {finopsLoading ? 'Sincronizando FinOps…' : 'Atualizando Painel…'}
          </p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-brandGreen" /> Painel Gerencial (FinOps)
          </h2>
          <p className="text-gray-400 mt-2 flex items-center gap-2 flex-wrap">
            <Sparkles className="w-4 h-4 text-brandGreen shrink-0" />
            Visão consolidada: catálogo, licenças, contratos e uso vs parado. Valores de hardware vêm do{' '}
            <span className="text-brandGreen font-semibold">Catálogo</span>.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-brandGreen focus:border-brandGreen block p-2 outline-none cursor-pointer transition-colors"
                disabled={isLoading}
              >
                <option value="current_month">Mês atual</option>
                <option value="last_6">Últimos 6 meses</option>
                <option value="ytd">YTD (ano)</option>
              </select>

              <div className="inline-flex rounded-lg overflow-hidden border border-gray-700">
                <button
                  type="button"
                  onClick={() => setViewMode('exec')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors ${
                    viewMode === 'exec' ? 'bg-brandGreen/15 text-brandGreen' : 'bg-gray-900/60 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Executivo
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('ops')}
                  className={`px-3 py-2 text-sm font-semibold transition-colors ${
                    viewMode === 'ops' ? 'bg-brandGreen/15 text-brandGreen' : 'bg-gray-900/60 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Operacional (TI)
                </button>
              </div>

              <button
                type="button"
                onClick={() => loadFinops()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/60 text-gray-200 hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${finopsLoading ? 'animate-spin' : ''}`} /> Atualizar
              </button>
            </div>

            <div className="text-[11px] text-gray-500">
              {finops?.meta?.generatedAt || finops?.generatedAt ? (
                <span>
                  Atualizado em{' '}
                  <span className="text-gray-300 font-semibold">
                    {new Date(finops.meta?.generatedAt || finops.generatedAt).toLocaleString('pt-BR')}
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filtroAtivo}
              onChange={(e) => setFiltroAtivo(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white text-sm rounded-lg focus:ring-brandGreen focus:border-brandGreen block p-2 outline-none cursor-pointer transition-colors"
              disabled={isLoading}
            >
              <option value="Todos">Todos os Ativos</option>
              <option value="Notebook">Notebooks</option>
              <option value="Celular">Celulares</option>
              <option value="CHIP">CHIPs</option>
              <option value="Starlink">Starlinks</option>
            </select>
            {filtroAtivo !== 'Todos' && (
              <span className="text-xs text-amber-400/90">
                Gráficos FinOps globais usam o parque completo; valuation ao lado reflete o filtro.
              </span>
            )}
          </div>
        </div>

        <div
          className="text-right bg-gray-900/50 p-4 rounded-2xl border border-gray-800 transition-all duration-300 hover:border-brandGreen/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.12)] group"
          title="Soma dos valores do catálogo para os ativos visíveis com o filtro atual"
        >
          <p className="text-sm text-gray-500 font-bold uppercase tracking-wider flex items-center justify-end gap-2">
            <Package className="w-4 h-4 text-brandGreen opacity-80 group-hover:scale-110 transition-transform" />
            Valuation (Catálogo)
          </p>
          <p className="text-3xl font-bold text-brandGreen drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {formatCurrency(filtroAtivo === 'Todos' && finopsHwTotal != null ? finopsHwTotal : valuationTotal)}
          </p>
        </div>
      </div>

      {finops?.hardware?.valorCompraTotal != null && filtroAtivo === 'Todos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-finops-reveal">
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Valuation do parque (valor de compra)</h3>
            <p className="text-2xl font-bold text-white">{formatCurrency(finops.hardware.valorCompraTotal)}</p>
            <p className="text-[11px] text-gray-500 mt-2">
              Ativos com valor_compra preenchido: <span className="text-gray-200 font-semibold">{finops.hardware.ativosComValorCompra || 0}</span>
            </p>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Valor residual (RFB)</h3>
            <p className="text-2xl font-bold text-cyan-300">{formatCurrency(finops.hardware.valorResidualRfbTotal || 0)}</p>
            <p className="text-[11px] text-gray-500 mt-2">
              Depreciação linear em {finops.hardware.depreciacaoRfb?.mesesVidaUtil || 60} meses (padrão TI).
            </p>
            {(finops.hardware.ativosResidualProxy || 0) > 0 && (
              <p className="text-[11px] text-gray-500 mt-1">
                Proxy via catálogo: <span className="text-gray-200 font-semibold">{finops.hardware.ativosResidualProxy}</span> ativos (estim.).
              </p>
            )}
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Depreciação acumulada</h3>
            <p className="text-2xl font-bold text-amber-300">
              {formatCurrency(Math.max(0, (finops.hardware.valorCompraTotal || 0) - (finops.hardware.valorResidualRfbTotal || 0)))}
            </p>
            <p className="text-[11px] text-gray-500 mt-2">Compra − residual (quanto já “perdeu” no tempo).</p>
          </div>
        </div>
      )}

      {finops && filtroAtivo === 'Todos' && (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          style={{ perspective: '1200px' }}
        >
          {[
            {
              title: 'Patrimônio em uso',
              sub: 'Catálogo · alocados',
              value: formatCurrency(finopsHwEmUso ?? 0),
              icon: CheckCircle,
              accent: 'border-brandGreen/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]',
              delay: '0ms',
            },
            {
              title: 'Parado / estoque',
              sub: 'Valor referência',
              value: formatCurrency(finopsHwParado ?? 0),
              icon: Package,
              accent: 'border-blue-500/30',
              delay: '80ms',
            },
            {
              title: 'Licenças · mês (compromisso)',
              sub: 'Custo × assentos',
              value: formatCurrency(filtroLicFornecedor === 'Todos' && filtroLicPlano === 'Todos' ? finopsCommitted : licensesFinopsCards.committed),
              icon: DollarSign,
              accent: 'border-emerald-500/20',
              delay: '160ms',
            },
            {
              title: 'Ociosidade licenças (estim.)',
              sub: 'Assentos pagos sem uso',
              value: formatCurrency(
                filtroLicFornecedor === 'Todos' && filtroLicPlano === 'Todos'
                  ? finopsWaste ?? 0
                  : licensesFinopsCards.waste
              ),
              icon: TrendingUp,
              accent: 'border-amber-500/30',
              delay: '240ms',
            },
          ].map((card, i) => (
            <div
              key={card.title}
              className={`bg-gray-900/80 border p-6 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-brandGreen/15 ${card.accent} animate-finops-reveal group cursor-default`}
              style={{ animationDelay: card.delay }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wide">{card.title}</h3>
                <card.icon className="w-5 h-5 text-brandGreen group-hover:scale-110 transition-transform duration-300" />
              </div>
              <p className="text-2xl font-bold text-white tracking-tight">{card.value}</p>
              <p className="text-[11px] text-gray-500 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {runRate != null && filtroAtivo === 'Todos' && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl animate-finops-reveal">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">Run Rate (anualizado)</h3>
              <p className="text-2xl font-bold text-white mt-1">{formatCurrency(runRate)}</p>
              <p className="text-[11px] text-gray-500 mt-1">
                Base: (licenças compromisso mensal + contratos realizado no período carregado) × 12
              </p>
            </div>
            {runRateDelta != null && (
              <div className="text-right">
                <div className="text-xs text-gray-500 font-bold uppercase">vs mês anterior</div>
                <div className={`text-lg font-bold ${runRateDelta >= 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {runRateDelta >= 0 ? '+' : ''}
                  {formatCurrency(runRateDelta)}
                </div>
                <div className="text-[11px] text-gray-500">
                  {runRatePrev != null ? `Anterior: ${formatCurrency(runRatePrev)}` : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {finops && filtroAtivo === 'Todos' && finops?.hardware?.valorResidualEstimado != null && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-finops-reveal">
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-1">Valor patrimonial residual (estim.)</h3>
            <p className="text-2xl font-bold text-cyan-300">{formatCurrency(finops.hardware.valorResidualEstimado)}</p>
            <p className="text-[11px] text-gray-500 mt-2">
              Depreciação linear (~{finops.hardware.depreciacao?.mesesVidaUtil ?? 36} meses) por data de aquisição; sem data mantém o valor de catálogo no residual. Ajuste{' '}
              <code className="text-gray-400">FINOPS_DEPRECIATION_MONTHS</code> no backend se precisar.
            </p>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl overflow-x-auto">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Investimento por modelo ou plano</h3>
            {(finops.hardware.investimentoPorModelo || []).length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-800">
                    <th className="py-2 pr-2">Tipo</th>
                    <th className="py-2 pr-2">Modelo / plano</th>
                    <th className="py-2 pr-2 text-center">Unid.</th>
                    <th className="py-2 text-right">Investido (cat.)</th>
                  </tr>
                </thead>
                <tbody>
                  {finops.hardware.investimentoPorModelo.slice(0, 10).map((row, i) => (
                    <tr key={`${row.category}-${row.nomeModelo}-${i}`} className="border-b border-gray-800/50 text-gray-300">
                      <td className="py-2 pr-2">{row.category}</td>
                      <td className="py-2 pr-2 font-medium text-white">{row.nomeModelo}</td>
                      <td className="py-2 pr-2 text-center">{row.count}</td>
                      <td className="py-2 text-right text-brandGreen font-semibold">{formatCurrency(row.investimentoTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-sm italic">Nenhum ativo com correspondência no catálogo.</p>
            )}
          </div>
        </div>
      )}

      {finops?.licenses && filtroAtivo === 'Todos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6 animate-finops-reveal">
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Waste (R$) — ociosidade</h3>
            <p className="text-2xl font-bold text-red-300">{formatCurrency(finops.licenses.wasteMonthly || 0)}</p>
            <p className="text-[11px] text-gray-500 mt-2">
              Meta eficiência &gt; <span className="text-gray-200 font-semibold">90%</span>
            </p>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Eficiência (uso)</h3>
            <p
              className={`text-2xl font-bold ${
                (finops.licenses.totalSeats || 0) > 0 &&
                (finops.licenses.assignedSeats || 0) / (finops.licenses.totalSeats || 1) >= 0.9
                  ? 'text-emerald-300'
                  : 'text-amber-300'
              }`}
            >
              {(
                (finops.licenses.totalSeats || 0) > 0
                  ? ((finops.licenses.assignedSeats || 0) / (finops.licenses.totalSeats || 1)) * 100
                  : 0
              ).toFixed(1)}
              %
            </p>
            <p className="text-[11px] text-gray-500 mt-2">
              {finops.licenses.assignedSeats || 0} / {finops.licenses.totalSeats || 0} licenças em uso
            </p>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Donut (Waste vs Usado)</h3>
            <div className="h-40 w-full">
              {(() => {
                const used = finops.licenses.usedMonthly || 0;
                const waste = finops.licenses.wasteMonthly || 0;
                const total = Math.max(0, used + waste);
                const data = [
                  { name: 'Usado', value: used },
                  { name: 'Waste', value: waste },
                ].filter((x) => x.value > 0);
                if (!total || data.length === 0) {
                  return <div className="h-full flex items-center justify-center text-xs text-gray-500">Sem dados</div>;
                }
                return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={72} paddingAngle={2}>
                        {data.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? '#10b981' : '#ef4444'} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        formatter={(v, name) => [formatCurrency(Number(v) || 0), name]}
                        contentStyle={{
                          background: 'rgba(17,24,39,0.95)',
                          border: '1px solid rgba(75,85,99,0.6)',
                          borderRadius: 12,
                        }}
                        labelStyle={{ color: '#9ca3af' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {finops?.savings && timeRange === 'current_month' && filtroAtivo === 'Todos' && (
        <div className="bg-gradient-to-r from-emerald-900/30 to-gray-900/60 border border-emerald-800/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-[0_0_25px_rgba(16,185,129,0.12)] animate-finops-reveal">
          <div>
            <div className="text-xs text-emerald-200/80 font-bold uppercase tracking-wide">Troféu da TI — savings</div>
            <div className="text-white font-bold text-lg mt-1">
              Economia gerada no mês: <span className="text-emerald-300">{formatCurrency(finops.savings.savedMonthly || 0)}</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Anualizado: <span className="text-emerald-200 font-semibold">{formatCurrency(finops.savings.savedAnnualized || 0)}</span>
              {finops.savings.month ? ` • ref ${finops.savings.month}` : ''}
            </div>
          </div>
          <div className="text-[11px] text-gray-400">
            Baseado nas revogações registradas em auditoria (valor_economizado).
          </div>
        </div>
      )}

      {contractVariance != null && filtroAtivo === 'Todos' && (
        <div className="bg-gradient-to-r from-gray-900/90 to-gray-900/60 border border-gray-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-finops-reveal hover:border-brandGreen/25 transition-colors">
          <div className="flex items-center gap-2 text-gray-300 text-sm">
            <PieChart className="w-5 h-5 text-brandGreen" />
            <span className="font-semibold text-white">Contratos (acumulado no período carregado)</span>
          </div>
          <div className="flex gap-6 text-sm">
            <span className="text-gray-500">
              Variação Realizado − Previsto:{' '}
              <span
                className={`font-bold ${contractVariance >= 0 ? 'text-amber-400' : 'text-brandGreen'}`}
              >
                {formatCurrency(contractVariance)}
              </span>
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { title: 'Total Ativos', val: stats.totalAssets, icon: HardDrive, border: 'border-gray-800' },
          {
            title: 'Em Uso (Ativos)',
            val: stats.activeAssets,
            icon: CheckCircle,
            border: 'border-brandGreen/30',
            glow: true,
          },
          { title: 'Em Estoque', val: stats.availableAssets, icon: Laptop, border: 'border-gray-800' },
          { title: 'Em Manutenção', val: stats.maintenanceAssets, icon: AlertTriangle, border: 'border-gray-800' },
          {
            title: 'CHIPs p/ Renovação',
            val: stats.expiringChips,
            icon: Cpu,
            border: stats.expiringChips > 0 ? 'border-red-900/50' : 'border-gray-800',
            danger: stats.expiringChips > 0,
          },
        ].map((c, idx) => (
          <div
            key={c.title}
            className={`bg-gray-900/80 border ${c.border} p-6 rounded-3xl shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-brandGreen/10 hover:border-brandGreen/30 ${c.glow ? 'shadow-[0_0_15px_rgba(16,185,129,0.1)]' : ''} ${c.danger ? 'shadow-[0_0_20px_rgba(239,68,68,0.15)]' : ''}`}
            style={{ animationDelay: `${idx * 40}ms` }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-bold ${c.danger && stats.expiringChips > 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {c.title}
              </h3>
              <c.icon
                className={`w-5 h-5 ${c.glow ? 'text-brandGreen' : c.danger && stats.expiringChips > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}
              />
            </div>
            <p className="text-3xl font-bold text-white">{c.val}</p>
          </div>
        ))}
      </div>

      {showFinopsCharts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="finops-chart-wrap bg-gray-900/80 border border-gray-800 p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <HardDrive className="text-brandGreen w-6 h-6" />
              Parque por tipo (valor catálogo)
            </h3>
            <p className="text-xs text-gray-500 mb-6">Passe o mouse nas barras para detalhes.</p>
            <div className="h-72 w-full">
              {byTypeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byTypeChartData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                    <defs>
                      <linearGradient id="barVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.35} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      tickFormatter={(v) =>
                        v >= 1000000 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1e3).toFixed(0)}k` : v
                      }
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#374151',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                      formatter={(value, name) =>
                        name === 'valor' ? [formatCurrency(value), 'Valor catálogo'] : [value, name]
                      }
                      labelFormatter={(label, payload) =>
                        payload?.[0]?.payload?.qtd != null ? `${label} · ${payload[0].payload.qtd} ativos` : label
                      }
                    />
                    <Bar
                      dataKey="valor"
                      fill="url(#barVal)"
                      radius={[8, 8, 0, 0]}
                      maxBarSize={56}
                      animationDuration={900}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">
                  Sem dados de tipo para exibir.
                </div>
              )}
            </div>
          </div>

          <div className="finops-chart-wrap bg-gray-900/80 border border-gray-800 p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <DollarSign className="text-brandGreen w-6 h-6" />
              Licenças (compromisso vs usado vs ocioso)
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Série por competência selecionada ({timeRange === 'current_month' ? 'mês atual' : timeRange === 'last_6' ? 'últimos 6 meses' : 'YTD'}). Sem histórico por mês, a série é uma projeção constante.
            </p>
            <div className="h-72 w-full">
              {licenseSeriesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={licenseSeriesChartData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
                    <defs>
                      <linearGradient id="licCommit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="licUsed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="licWaste" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis
                      stroke="#9CA3AF"
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      tickFormatter={(v) => (v >= 1000000 ? `${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `${(v / 1e3).toFixed(0)}k` : v)}
                    />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff' }}
                      formatter={(value) => formatCurrency(value)}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                    <Area type="monotone" dataKey="Compromisso" stroke="#10b981" fill="url(#licCommit)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Usado" stroke="#3b82f6" fill="url(#licUsed)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Ocioso" stroke="#eab308" fill="url(#licWaste)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-sm italic">
                  Sem série disponível.
                </div>
              )}
            </div>
          </div>

          <div className="finops-chart-wrap bg-gray-900/80 border border-gray-800 p-8 rounded-3xl shadow-xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <PieChart className="text-brandGreen w-6 h-6" />
              Ativos por status operacional
            </h3>
            <p className="text-xs text-gray-500 mb-6">Distribuição de contagem (não valor).</p>
            <div className="h-72 w-full flex items-center justify-center">
              {statusPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RePie>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={96}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={1000}
                    >
                      {statusPieData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="rgba(0,0,0,0.25)"
                          className="outline-none transition-opacity duration-200 hover:opacity-90"
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        borderColor: '#374151',
                        borderRadius: '12px',
                        color: '#fff',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}
                      formatter={(value) => <span className="text-gray-300">{value}</span>}
                    />
                  </RePie>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-500 text-sm italic">Sem distribuição de status.</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-900/80 border border-gray-800 p-8 rounded-3xl shadow-xl flex flex-col transition-all duration-300 finops-chart-wrap">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <PieChart className="text-brandGreen w-6 h-6" /> FinOps: Previsto vs Realizado
            </h3>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="text-gray-400 w-4 h-4" />
              <select
                value={filtroFornecedor}
                onChange={(e) => setFiltroFornecedor(e.target.value)}
                className="bg-black border border-gray-700 text-sm rounded-xl px-4 py-2 text-gray-300 outline-none hover:border-brandGreen focus:border-brandGreen transition-colors cursor-pointer w-full sm:w-auto min-w-[200px]"
              >
                {fornecedoresUnicos.map((forn, idx) => (
                  <option key={idx} value={forn}>
                    {forn === 'Todos' ? 'Todos os Fornecedores' : forn}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="h-72 w-full">
            {contractChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={contractChartData}>
                  <defs>
                    <linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4B5563" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4B5563" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 12 }} dy={10} />
                  <YAxis
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                    tickFormatter={(value) => {
                      if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
                      if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
                      return `R$ ${value}`;
                    }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#111827',
                      borderColor: '#374151',
                      color: '#fff',
                      borderRadius: '12px',
                    }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="Previsto"
                    stroke="#9CA3AF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrevisto)"
                    animationDuration={1100}
                  />
                  <Area
                    type="monotone"
                    dataKey="Realizado"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRealizado)"
                    animationDuration={1100}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 italic text-sm border-2 border-dashed border-gray-800 rounded-xl">
                <PieChart className="w-10 h-10 text-gray-700 mb-2" />
                Nenhuma medição encontrada para este filtro.
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 p-8 rounded-3xl shadow-xl flex flex-col justify-between transition-all duration-300 hover:border-brandGreen/20">
          <div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <DollarSign className="text-brandGreen w-6 h-6" /> Licenciamento (Software)
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex items-center gap-2 w-full">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filtroLicFornecedor}
                  onChange={(e) => setFiltroLicFornecedor(e.target.value)}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brandGreen transition-colors"
                >
                  {licFornecedoresUnicos.map((x) => (
                    <option key={x} value={x}>
                      {x === 'Todos' ? 'Todos os fornecedores (licenças)' : x}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 w-full">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filtroLicPlano}
                  onChange={(e) => setFiltroLicPlano(e.target.value)}
                  className="w-full bg-black/60 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brandGreen transition-colors"
                >
                  {licPlanosUnicos.map((x) => (
                    <option key={x} value={x}>
                      {x === 'Todos' ? 'Todos os planos' : x}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-black/50 p-5 rounded-2xl border border-gray-800 hover:border-brandGreen/25 transition-colors">
                <p className="text-gray-400 text-sm font-bold mb-1">Compromisso mensal estimado</p>
                <p className="text-3xl font-bold text-white">
                  {formatCurrency(filtroLicFornecedor === 'Todos' && filtroLicPlano === 'Todos' ? finopsCommitted : licensesFinopsCards.committed)}
                </p>
                {(filtroLicFornecedor !== 'Todos' || filtroLicPlano !== 'Todos') && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    Filtro aplicado: {licensesFinopsCards.seatsUsed}/{licensesFinopsCards.seatsTotal} seats em uso · ociosidade{' '}
                    {(licensesFinopsCards.idlePct * 100).toFixed(0)}%
                  </p>
                )}
              </div>
              {finopsWaste != null && (
                <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/20">
                  <p className="text-amber-200/90 text-xs font-bold mb-1">Ociosidade estimada (mês)</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {formatCurrency(
                      filtroLicFornecedor === 'Todos' && filtroLicPlano === 'Todos'
                        ? finopsWaste
                        : licensesFinopsCards.waste
                    )}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
                  <p className="text-gray-400 text-xs font-bold mb-1">Atribuições ativas</p>
                  <p className="text-2xl font-bold text-brandGreen">{stats.activeLicensesCount}</p>
                </div>
                <div className="bg-black/50 p-4 rounded-2xl border border-gray-800">
                  <p className="text-gray-400 text-xs font-bold mb-1">Colaboradores ativos</p>
                  <p className="text-2xl font-bold text-white">{stats.activeEmployees}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-400 mb-4">
              <Zap className="inline w-4 h-4 text-yellow-500 mr-1" /> Otimização sugerida
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
              <p className="text-yellow-500 text-sm font-semibold">
                {stats.totalEmployees - stats.activeEmployees > 0
                  ? `Existem ${stats.totalEmployees - stats.activeEmployees} colaboradores desligados. Revogue licenças na aba Offboarding / Licenças.`
                  : 'Base ativa alinhada; revise ociosidade de assentos acima.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {finops?.licenses?.topWaste?.length > 0 && filtroAtivo === 'Todos' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-finops-reveal">
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" /> Top licenças — maior ociosidade mensal (estimada)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                    <th className="py-2 pr-4">Software</th>
                    <th className="py-2 pr-4">Fornecedor</th>
                    <th className="py-2 pr-4 text-right">Ocioso / mês</th>
                    <th className="py-2 text-right">Uso</th>
                  </tr>
                </thead>
                <tbody>
                  {finops.licenses.topWaste.slice(0, 6).map((row) => (
                    <tr key={row.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                      <td className="py-2 pr-4 font-medium text-white">{row.nome}</td>
                      <td className="py-2 pr-4 text-gray-400">{row.fornecedor || '—'}</td>
                      <td className="py-2 pr-4 text-right text-amber-400 font-mono">{formatCurrency(row.wasteMonthly)}</td>
                      <td className="py-2 text-right text-gray-400">
                        {row.quantidade_em_uso}/{row.quantidade_total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {finops?.licenses?.topCost?.length > 0 && (
            <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-brandGreen" /> Top licenças — maior custo mensal (compromisso)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500 text-xs uppercase">
                      <th className="py-2 pr-4">Software</th>
                      <th className="py-2 pr-4">Fornecedor</th>
                      <th className="py-2 text-right">Compromisso / mês</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finops.licenses.topCost.slice(0, 6).map((row) => (
                      <tr key={row.id} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                        <td className="py-2 pr-4 font-medium text-white">{row.nome}</td>
                        <td className="py-2 pr-4 text-gray-400">{row.fornecedor || '—'}</td>
                        <td className="py-2 text-right text-brandGreen font-mono">{formatCurrency(row.committedMonthly)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {(finops?.hardware?.assetsSemMatchCatalogo > 0 || finops?.hardware?.ativosComCatalogoSemDataAquisicao > 0) &&
        filtroAtivo === 'Todos' && (
          <div className="text-xs text-amber-400/90 text-center space-y-1">
            {finops.hardware.assetsSemMatchCatalogo > 0 && (
              <p>
                {finops.hardware.assetsSemMatchCatalogo} ativo(s) com modelo/plano sem valor no catálogo — cadastre em Catálogo para valuation completo.
              </p>
            )}
            {finops.hardware.ativosComCatalogoSemDataAquisicao > 0 && (
              <p>
                {finops.hardware.ativosComCatalogoSemDataAquisicao} ativo(s) já precificados no catálogo sem data de aquisição — preencha no inventário para depreciação mais fiel.
              </p>
            )}
          </div>
        )}

      <div className="mt-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <Building className="w-7 h-7 text-brandGreen" /> Distribuição por Grupos / Obras
        </h3>
        {groupStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groupStats.map(([groupName, counts]) => (
              <div
                key={groupName}
                onClick={() => setSelectedGroupForModal(groupName)}
                className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl cursor-pointer hover:border-brandGreen/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-brandGreen/10 transition-all duration-300 group"
              >
                <h4
                  className="text-white font-bold text-lg mb-3 group-hover:text-brandGreen transition-colors truncate"
                  title={groupName}
                >
                  {groupName}
                </h4>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400 text-xs">Total de Ativos</span>
                  <span className="text-xl font-bold text-white">{counts.total}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 border-t border-gray-800 pt-2 mt-2">
                  <span>Celulares: {counts.celular}</span>
                  <span>CHIPs: {counts.chip}</span>
                  <span>Starlinks: {counts.starlink}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-900/80 border border-gray-800 p-8 rounded-3xl text-center">
            <p className="text-gray-500 italic">Nenhum equipamento vinculado a Grupos/Obras no momento.</p>
          </div>
        )}
      </div>

      {selectedGroupForModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-3">
                <Building className="w-6 h-6 text-brandGreen" />
                Ativos do Grupo: <span className="text-brandGreen">{selectedGroupForModal}</span>
              </h2>
              <button
                onClick={() => setSelectedGroupForModal(null)}
                className="text-gray-400 hover:text-white transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-black/60 border-b border-gray-800 uppercase text-xs sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-4">Tipo</th>
                    <th className="px-4 py-4">Identificador / Modelo</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {assetsInSelectedGroup.length > 0 ? (
                    assetsInSelectedGroup.map((a) => {
                      const type = a.asset_type;
                      let ident = '';
                      let extra = '';
                      let resp = '';

                      if (type === 'Celular') {
                        ident = a.celular?.imei ? `IMEI: ${a.celular.imei}` : '-';
                        extra = a.celular?.modelo || '';
                        resp = a.celular?.responsavel || '-';
                      } else if (type === 'CHIP') {
                        ident = a.chip?.numero ? `Nº: ${a.chip.numero}` : '-';
                        extra = a.chip?.plano || '';
                        resp = a.chip?.responsavel || '-';
                      } else if (type === 'Starlink') {
                        ident = a.starlink?.modelo || '-';
                        extra = a.starlink?.localizacao || '';
                        resp = a.starlink?.responsavel || '-';
                      }

                      const statusStr = (a.status || '').trim().toLowerCase();

                      return (
                        <tr key={a.id} className="hover:bg-gray-800/80 transition-colors">
                          <td className="px-4 py-3 font-bold text-white">{type}</td>
                          <td className="px-4 py-3">
                            <p className="text-gray-200 font-semibold">{ident}</p>
                            {extra && <p className="text-xs text-gray-500">{extra}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-1 border rounded-full text-[10px] font-bold uppercase ${
                                statusStr === 'disponível' || statusStr === 'disponivel'
                                  ? 'border-brandGreen/30 text-brandGreen'
                                  : statusStr === 'manutenção' || statusStr === 'manutencao'
                                    ? 'border-yellow-500/30 text-yellow-500'
                                    : 'border-gray-600 text-gray-400'
                              }`}
                            >
                              {a.status || 'Indefinido'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm font-medium">{resp}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-gray-500 italic">
                        Nenhum ativo detalhado encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
