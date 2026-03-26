import React, { useMemo, useState } from 'react';
import { Laptop, AlertTriangle, CheckCircle, Clock, DollarSign, PieChart, Users, Zap, Calendar, HardDrive, LayoutDashboard, Cpu, Building, Filter, Loader2, X } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function DashboardModule({ assets, employees, licenses, contracts, catalogItems, formatCurrency, isLoading }) {
  
  const [filtroAtivo, setFiltroAtivo] = useState('Todos');
  const [selectedGroupForModal, setSelectedGroupForModal] = useState(null);
  const [filtroFornecedor, setFiltroFornecedor] = useState('Todos');

  const ativosFiltrados = useMemo(() => {
    if (!assets) return [];
    if (filtroAtivo === 'Todos') return assets;
    
    const target = filtroAtivo.trim().toLowerCase();
    return assets.filter(a => {
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
    
    const activeAssets = ativosFiltrados.filter(a => 
      (a.status || '').trim().toLowerCase() === 'em uso'
    ).length;
    
    const availableAssets = ativosFiltrados.filter(a => {
      const statusStr = (a.status || '').trim().toLowerCase();
      const isAvailable = statusStr === 'disponível' || statusStr === 'disponivel';
      const aType = (a.asset_type || '').trim().toLowerCase();
      
      if (aType === 'notebook') return isAvailable;
      
      const rawGroup = a.celular?.grupo || a.chip?.grupo || a.starlink?.grupo || '';
      return isAvailable && rawGroup.trim().toLowerCase() === 'estoque';
    }).length;
    
    const maintenanceAssets = ativosFiltrados.filter(a => 
      (a.status || '').trim().toLowerCase() === 'manutenção' ||
      (a.status || '').trim().toLowerCase() === 'manutencao'
    ).length;
    
    const expiringChips = ativosFiltrados.filter(a => 
      (a.asset_type || '').trim().toLowerCase() === 'chip' && 
      ((a.status || '').trim().toLowerCase() === 'renovação' || (a.status || '').trim().toLowerCase() === 'renovacao')
    ).length;

    const totalEmployees = employees ? employees.length : 0;
    const activeEmployees = employees ? employees.filter(e => (e.status || '').trim().toLowerCase() !== 'desligado').length : 0;
    
    const activeLicensesCount = licenses ? licenses.reduce((acc, lic) => acc + (lic.assignments ? lic.assignments.filter(a => !a.revoked_at).length : 0), 0) : 0;
    const monthlyLicenseCost = licenses ? licenses.reduce((acc, lic) => acc + ((lic.plano || '').trim().toLowerCase() === 'mensal' ? lic.custo : lic.custo / 12), 0) : 0;

    return { totalAssets, activeAssets, availableAssets, maintenanceAssets, expiringChips, totalEmployees, activeEmployees, activeLicensesCount, monthlyLicenseCost };
  }, [ativosFiltrados, employees, licenses]);

  const groupStats = useMemo(() => {
    const groups = {};
    if (assets) {
      assets.forEach(a => {
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
    return Object.entries(groups).sort((a,b) => b[1].total - a[1].total);
  }, [assets]);

  const assetsInSelectedGroup = useMemo(() => {
    if (!selectedGroupForModal || !assets) return [];
    return assets.filter(a => {
      const rawGroup = a.celular?.grupo || a.chip?.grupo || a.starlink?.grupo || '';
      return rawGroup.trim() === selectedGroupForModal;
    });
  }, [assets, selectedGroupForModal]);

  const fornecedoresUnicos = useMemo(() => {
    if (!contracts) return ['Todos'];
    const list = contracts.map(c => (c.fornecedor || 'Desconhecido').trim()).filter(Boolean);
    return ['Todos', ...new Set(list)].sort();
  }, [contracts]);

  const contractChartData = useMemo(() => {
    const dataMap = {};
    if (contracts) {
      let dadosFiltrados = contracts;
      if (filtroFornecedor !== 'Todos') {
          dadosFiltrados = dadosFiltrados.filter(c => (c.fornecedor || 'Desconhecido').trim() === filtroFornecedor);
      }

      dadosFiltrados.forEach(c => {
        if (!dataMap[c.mes_competencia]) dataMap[c.mes_competencia] = { name: c.mes_competencia, Previsto: 0, Realizado: 0 };
        dataMap[c.mes_competencia].Previsto += parseFloat(c.valor_previsto || 0);
        dataMap[c.mes_competencia].Realizado += parseFloat(c.valor_realizado || 0);
      });
    }
    return Object.values(dataMap).sort((a, b) => a.name.localeCompare(b.name));
  }, [contracts, filtroFornecedor]);

  const valuationTotal = useMemo(() => {
    let total = 0;
    ativosFiltrados.forEach(a => {
        const aType = (a.asset_type || '').trim().toLowerCase();
        let catModel = '';
        
        if (aType === 'notebook' && a.notebook) catModel = a.notebook.modelo;
        else if (aType === 'celular' && a.celular) catModel = a.celular.modelo;
        else if (aType === 'starlink' && a.starlink) catModel = a.starlink.modelo;
        else if (aType === 'chip' && a.chip) catModel = a.chip.plano;

        const targetModel = (catModel || '').trim().toLowerCase();

        const mappedCatalog = (catalogItems || []).find(c => 
          (c.category || '').trim().toLowerCase() === aType && 
          (c.nome || '').trim().toLowerCase() === targetModel
        );
        if (mappedCatalog) total += parseFloat(mappedCatalog.valor || 0);
    });
    return total;
  }, [ativosFiltrados, catalogItems]);

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative">
      
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm rounded-3xl min-h-[600px]">
          <Loader2 className="w-16 h-16 text-brandGreen animate-spin mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-brandGreen font-bold animate-pulse tracking-widest uppercase text-sm">Atualizando Painel...</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-brandGreen"/> Painel Gerencial (FinOps)
          </h2>
          <p className="text-gray-400 mt-2">Visão consolidada de ativos, custos e alertas operacionais.</p>
          
          <div className="mt-4 flex items-center gap-2">
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
          </div>
        </div>

        <div className="text-right bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Valuation do Parque (Catálogo)</p>
            <p className="text-3xl font-bold text-brandGreen drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">{formatCurrency(valuationTotal)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-3xl shadow-xl hover:-translate-y-1 hover:shadow-brandGreen/10 hover:border-brandGreen/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-bold">Total Ativos</h3><HardDrive className="text-brandGreen w-5 h-5"/>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalAssets}</p>
        </div>

        <div className="bg-gray-900/80 border border-brandGreen/30 p-6 rounded-3xl shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-brandGreen/20 transition-all duration-300">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-brandGreen/10 rounded-full blur-xl"></div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-brandGreen text-sm font-bold">Em Uso (Ativos)</h3><CheckCircle className="text-brandGreen w-5 h-5"/>
          </div>
          <p className="text-3xl font-bold text-white relative z-10">{stats.activeAssets}</p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-3xl shadow-xl hover:-translate-y-1 hover:shadow-brandGreen/10 hover:border-blue-400/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-bold">Em Estoque</h3><Laptop className="text-blue-400 w-5 h-5"/>
          </div>
          <p className="text-3xl font-bold text-white">{stats.availableAssets}</p>
        </div>

        <div className="bg-gray-900/80 border border-gray-800 p-6 rounded-3xl shadow-xl hover:-translate-y-1 hover:shadow-brandGreen/10 hover:border-yellow-500/30 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm font-bold">Em Manutenção</h3><AlertTriangle className="text-yellow-500 w-5 h-5"/>
          </div>
          <p className="text-3xl font-bold text-white">{stats.maintenanceAssets}</p>
        </div>

        <div className={`bg-gray-900/80 border p-6 rounded-3xl shadow-xl hover:-translate-y-1 transition-all duration-300 ${stats.expiringChips > 0 ? 'border-red-900/50 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-red-500/20' : 'border-gray-800 hover:shadow-brandGreen/10 hover:border-gray-600'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-sm font-bold ${stats.expiringChips > 0 ? 'text-red-400' : 'text-gray-400'}`}>CHIPs p/ Renovação</h3><Cpu className={`${stats.expiringChips > 0 ? 'text-red-500 animate-pulse' : 'text-gray-500'} w-5 h-5`}/>
          </div>
          <p className="text-3xl font-bold text-white">{stats.expiringChips}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-gray-900/80 border border-gray-800 p-8 rounded-3xl shadow-xl flex flex-col transition-all duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <PieChart className="text-brandGreen w-6 h-6"/> FinOps: Previsto vs Realizado
            </h3>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="text-gray-400 w-4 h-4"/>
                <select 
                    value={filtroFornecedor} 
                    onChange={(e) => setFiltroFornecedor(e.target.value)}
                    className="bg-black border border-gray-700 text-sm rounded-xl px-4 py-2 text-gray-300 outline-none hover:border-brandGreen focus:border-brandGreen transition-colors cursor-pointer w-full sm:w-auto min-w-[200px]"
                >
                    {fornecedoresUnicos.map((forn, idx) => (
                        <option key={idx} value={forn}>{forn === 'Todos' ? 'Todos os Fornecedores' : forn}</option>
                    ))}
                </select>
            </div>
          </div>
          
          <div className="h-72 w-full">
            {contractChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={contractChartData}>
                    <defs>
                      <linearGradient id="colorPrevisto" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4B5563" stopOpacity={0.3}/><stop offset="95%" stopColor="#4B5563" stopOpacity={0}/></linearGradient>
                      <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.5}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" tick={{fill: '#9CA3AF', fontSize: 12}} dy={10} />
                    <YAxis 
                        stroke="#9CA3AF" 
                        tick={{fill: '#9CA3AF', fontSize: 12}} 
                        tickFormatter={(value) => {
                            if(value >= 1000000) return `R$ ${(value/1000000).toFixed(1)}M`;
                            if(value >= 1000) return `R$ ${(value/1000).toFixed(0)}k`;
                            return `R$ ${value}`;
                        }} 
                    />
                    <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff', borderRadius: '12px' }} 
                        formatter={(value) => formatCurrency(value)} 
                    />
                    <Area type="monotone" dataKey="Previsto" stroke="#9CA3AF" strokeWidth={2} fillOpacity={1} fill="url(#colorPrevisto)" />
                    <Area type="monotone" dataKey="Realizado" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRealizado)" />
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

        <div className="bg-gray-900/80 border border-gray-800 p-8 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><DollarSign className="text-brandGreen w-6 h-6"/> Resumo de Licenciamento</h3>
            <div className="space-y-6">
              <div className="bg-black/50 p-5 rounded-2xl border border-gray-800">
                <p className="text-gray-400 text-sm font-bold mb-1">Custo Mensal Estimado</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(stats.monthlyLicenseCost)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/50 p-4 rounded-2xl border border-gray-800"><p className="text-gray-400 text-xs font-bold mb-1">Licenças Ativas</p><p className="text-2xl font-bold text-brandGreen">{stats.activeLicensesCount}</p></div>
                <div className="bg-black/50 p-4 rounded-2xl border border-gray-800"><p className="text-gray-400 text-xs font-bold mb-1">Colaboradores</p><p className="text-2xl font-bold text-white">{stats.activeEmployees}</p></div>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-800">
            <p className="text-sm text-gray-400 mb-4"><Zap className="inline w-4 h-4 text-yellow-500 mr-1"/> Otimização Sugerida</p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl">
              <p className="text-yellow-500 text-sm font-semibold">Existem {stats.totalEmployees - stats.activeEmployees} colaboradores desligados. Verifique se as licenças vinculadas a eles foram revogadas na aba "Revogação".</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Building className="w-7 h-7 text-brandGreen"/> Distribuição por Grupos / Obras</h3>
        {groupStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {groupStats.map(([groupName, counts]) => (
              <div 
                key={groupName} 
                onClick={() => setSelectedGroupForModal(groupName)}
                className="bg-gray-900/80 border border-gray-800 p-5 rounded-2xl cursor-pointer hover:border-brandGreen/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-brandGreen/10 transition-all duration-300 group"
              >
                <h4 className="text-white font-bold text-lg mb-3 group-hover:text-brandGreen transition-colors truncate" title={groupName}>{groupName}</h4>
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
                <Building className="w-6 h-6 text-brandGreen"/> 
                Ativos do Grupo: <span className="text-brandGreen">{selectedGroupForModal}</span>
              </h2>
              <button onClick={() => setSelectedGroupForModal(null)} className="text-gray-400 hover:text-white transition-colors p-2">
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
                  {assetsInSelectedGroup.length > 0 ? assetsInSelectedGroup.map(a => {
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
                          <span className={`px-2 py-1 border rounded-full text-[10px] font-bold uppercase ${statusStr === 'disponível' || statusStr === 'disponivel' ? 'border-brandGreen/30 text-brandGreen' : statusStr === 'manutenção' || statusStr === 'manutencao' ? 'border-yellow-500/30 text-yellow-500' : 'border-gray-600 text-gray-400'}`}>
                            {a.status || 'Indefinido'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm font-medium">{resp}</td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-gray-500 italic">Nenhum ativo detalhado encontrado.</td>
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