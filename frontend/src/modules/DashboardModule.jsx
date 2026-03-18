import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

export default function DashboardModule({ assets, employees, licenses, contracts, catalogItems, formatCurrency }) {
  // 1. Estados Locais
  const [dashboardDeviceFilter, setDashboardDeviceFilter] = useState('Todos');
  const [dashContractFilter, setDashContractFilter] = useState('');
  
  // 2. Estado Derivado (SOLUÇÃO PARA O ERRO DO USEEFFECT)
  // Em vez de usar useEffect para setar o valor inicial, nós lemos a lista e já assumimos o primeiro valor se estiver vazio.
  const uniqueContractsList = useMemo(() => [...new Set(contracts.map(c => c.servico))].filter(Boolean), [contracts]);
  const activeContractFilter = dashContractFilter || (uniqueContractsList.length > 0 ? uniqueContractsList[0] : 'Todos');

  // 3. Cálculos de Infraestrutura
  const dashboardAssets = dashboardDeviceFilter === 'Todos' ? assets : assets.filter(a => a.asset_type === dashboardDeviceFilter);
  const eqTotal = dashboardAssets.length; 
  const eqDisp = dashboardAssets.filter(a => a.status === 'Disponível').length; 
  const eqUso = dashboardAssets.filter(a => a.status === 'Em uso').length; 
  const eqManut = dashboardAssets.filter(a => a.status === 'Manutenção').length; 
  const eqInativos = dashboardAssets.filter(a => ['Descartado', 'Bloqueado', 'Inutilizado', 'Extraviado/Roubado'].includes(a.status)).length;
  const qtdNotebook = dashboardAssets.filter(a => a.asset_type === 'Notebook').length; 
  const qtdCelular = dashboardAssets.filter(a => a.asset_type === 'Celular').length; 
  const qtdChip = dashboardAssets.filter(a => a.asset_type === 'CHIP').length; 
  const qtdStarlink = dashboardAssets.filter(a => a.asset_type === 'Starlink').length;
  
  // 4. Cálculos Licenças e Contratos
  const licTotal = licenses.reduce((acc, l) => acc + l.quantidade_total, 0); 
  const custoMensalLicencas = licenses.filter(l => l.plano === 'Mensal').reduce((acc, l) => acc + (l.custo * l.quantidade_total), 0);
  const topLicenses = [...licenses].sort((a,b) => (b.custo * b.quantidade_total) - (a.custo * a.quantidade_total)).slice(0, 5);

  const dashFilteredContracts = activeContractFilter === 'Todos' ? contracts : contracts.filter(c => c.servico === activeContractFilter);
  const contractSummary = dashFilteredContracts.reduce((acc, c) => { acc.totalPrevisto += Number(c.valor_previsto); acc.totalRealizado += Number(c.valor_realizado); return acc; }, { totalPrevisto: 0, totalRealizado: 0 });
  const isSaving = (contractSummary.totalRealizado - contractSummary.totalPrevisto) <= 0;
  const contractChartData = Object.values(dashFilteredContracts.reduce((acc, c) => { const mes = c.mes_competencia; if (!acc[mes]) acc[mes] = { name: mes, Previsto: 0, Realizado: 0 }; acc[mes].Previsto += Number(c.valor_previsto); acc[mes].Realizado += Number(c.valor_realizado); return acc; }, {})).sort((a,b) => a.name.localeCompare(b.name));

  // 5. Valuation do Estoque
  const investmentByModel = {};
  const valorEstoqueTotal = dashboardAssets.reduce((acc, a) => { 
      if (['Descartado', 'Bloqueado', 'Inutilizado', 'Extraviado/Roubado'].includes(a.status)) return acc; 
      let modelName = a.asset_type === 'Notebook' ? a.notebook?.modelo : a.asset_type === 'Celular' ? a.celular?.modelo : a.asset_type === 'Starlink' ? a.starlink?.modelo : a.asset_type === 'CHIP' ? a.chip?.plano : 'Desconhecido';
      const catItem = catalogItems.find(c => c.category === a.asset_type && c.nome.toLowerCase() === (modelName || '').toLowerCase());
      const finalVal = catItem ? Number(catItem.valor) : 0; 
      const key = `${modelName || 'Desconhecido'}`;
      if (!investmentByModel[key]) investmentByModel[key] = { name: key, Valor: 0 };
      investmentByModel[key].Valor += finalVal;
      return acc + finalVal; 
  }, 0);
  const investmentChartData = Object.values(investmentByModel).filter(x => x.Valor > 0).sort((a,b) => b.Valor - a.Valor).slice(0, 5);

  // 6. Colaboradores e Garantias (AQUI RESOLVE O SEGUNDO ERRO)
  const activeEmployees = employees.filter(e => e.status !== 'Desligado');
  const activeEmpsByDept = activeEmployees.reduce((acc, emp) => { const d = emp.departamento || 'Sem Departamento'; acc[d] = (acc[d] || 0) + 1; return acc; }, {});
  const deptChartData = Object.keys(activeEmpsByDept).map(k => ({ name: k, count: activeEmpsByDept[k] })).sort((a,b) => b.count - a.count);

  const today = new Date(); const thirtyDaysFromNow = new Date(); thirtyDaysFromNow.setDate(today.getDate() + 30);
  const expiringAssets = dashboardAssets.filter(a => { if (a.asset_type === 'Notebook' && a.notebook?.garantia) { try { const garDate = new Date(String(a.notebook.garantia).substring(0, 10) + 'T00:00:00'); return garDate <= thirtyDaysFromNow; } catch { return false; } } return false; }).sort((a, b) => { try { return new Date(String(a.notebook.garantia).substring(0, 10)) - new Date(String(b.notebook.garantia).substring(0, 10)); } catch { return 0; } });

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-white">Painel Gerencial</h2>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm font-medium">Analisar Infra:</span>
          <select value={dashboardDeviceFilter} onChange={(e) => setDashboardDeviceFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-sm text-brandGreen font-bold outline-none cursor-pointer hover:border-brandGreen/50 transition-colors">
            <option value="Todos">Toda a Infraestrutura</option><option value="Notebook">Apenas Notebooks</option><option value="Celular">Apenas Celulares</option><option value="CHIP">Apenas CHIPs</option><option value="Starlink">Apenas Starlinks</option>
          </select>
        </div>
      </div>
      
      {/* Cards Superiores */}
      <div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-5 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(0,0,0,0.5)] hover:border-gray-700"><p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Total</p><p className="text-3xl font-bold text-white">{eqTotal}</p></div>
          <div className="bg-gray-900/80 backdrop-blur border-b-4 border-b-brandGreen border-gray-800 p-5 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(16,185,129,0.15)] hover:border-gray-700"><p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Disponíveis</p><p className="text-3xl font-bold text-white">{eqDisp}</p></div>
          <div className="bg-gray-900/80 backdrop-blur border-b-4 border-b-blue-500 border-gray-800 p-5 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(59,130,246,0.15)] hover:border-gray-700"><p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Em Uso</p><p className="text-3xl font-bold text-white">{eqUso}</p></div>
          <div className="bg-gray-900/80 backdrop-blur border-b-4 border-b-yellow-500 border-gray-800 p-5 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(234,179,8,0.15)] hover:border-gray-700"><p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Manutenção</p><p className="text-3xl font-bold text-white">{eqManut}</p></div>
          <div className="bg-gray-900/80 backdrop-blur border-b-4 border-b-red-500 border-gray-800 p-5 rounded-2xl shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_20px_rgba(239,68,68,0.15)] hover:border-gray-700"><p className="text-[11px] text-gray-400 font-bold uppercase mb-1">Inativos</p><p className="text-3xl font-bold text-white">{eqInativos}</p></div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium border-t border-gray-800/50 pt-4 mt-4">
          <span className="text-gray-400">💻 Notebooks: <strong className="text-white">{qtdNotebook}</strong></span>
          <span className="text-gray-400">📱 Celulares: <strong className="text-white">{qtdCelular}</strong></span>
          <span className="text-gray-400">📟 CHIPs: <strong className="text-white">{qtdChip}</strong></span>
          <span className="text-gray-400">📡 Starlinks: <strong className="text-white">{qtdStarlink}</strong></span>
        </div>
      </div>

      {/* Cards Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-gray-900 to-[#0a0a0f] border border-gray-800 p-6 rounded-3xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:border-gray-600"><div><h2 className="text-sm font-semibold text-gray-400 uppercase">Licenças Globais</h2><p className="text-4xl font-bold text-white mt-2">{licTotal}</p></div></div>
        <div className="bg-gradient-to-br from-gray-900 to-[#0a0a0f] border border-gray-800 p-6 rounded-3xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)] hover:border-gray-600"><div><h2 className="text-sm font-semibold text-gray-400 uppercase">Custo SaaS Mensal</h2><p className="text-3xl font-bold text-white mt-2">{formatCurrency(custoMensalLicencas)}</p></div></div>
        <div className={`bg-gradient-to-br from-gray-900 to-[#0a0a0f] border-2 p-6 rounded-3xl shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)] ${isSaving ? 'border-brandGreen/30 hover:border-brandGreen/50' : 'border-red-900/50 hover:border-red-900/80'}`}><div><h2 className="text-sm font-semibold text-gray-400 uppercase">Contrato: {activeContractFilter}</h2><p className="text-3xl font-bold text-white mt-2">{formatCurrency(contractSummary.totalRealizado)}</p></div></div>
        <div className="bg-gradient-to-br from-gray-900 to-[#0a0a0f] border border-gray-800 p-6 rounded-3xl shadow-lg relative group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(16,185,129,0.1)] hover:border-brandGreen/30">
          <div><h2 className="text-sm font-semibold text-gray-400 uppercase">Capital Físico Estimado</h2><p className="text-3xl font-bold text-white mt-2">{formatCurrency(valorEstoqueTotal)}</p></div>
          <div className="absolute top-2 right-2 hidden group-hover:block bg-black/90 backdrop-blur text-xs p-3 rounded-xl border border-gray-700 w-48 shadow-2xl text-gray-300 z-10">Este valor é calculado cruzando seu Inventário Físico com o Catálogo de Preços.</div>
        </div>
      </div>

      {/* Gráficos e Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col h-[350px] col-span-1 lg:col-span-2 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-bold text-white mb-6">Investimento Físico por Modelo (Top 5)</h2>
            <div className="flex-1 w-full h-full">
            {investmentChartData.length === 0 ? (<div className="flex items-center justify-center h-full text-gray-500 italic text-sm">Cadastre preços no Catálogo para gerar este gráfico.</div>) : (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={investmentChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                    <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                    <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} width={140} />
                    <RechartsTooltip cursor={{fill: '#1F2937'}} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="Valor" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
                </ResponsiveContainer>
            )}
            </div>
        </div>
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col h-[350px] col-span-1 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
            <h2 className="text-lg font-bold text-blue-400 mb-4">Top Custo SaaS (Mensal)</h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {topLicenses.length === 0 ? <p className="text-sm text-gray-500 text-center mt-10">Nenhuma licença cadastrada.</p> : topLicenses.map(lic => (
                    <div key={lic.id} className="p-3 rounded-xl border border-gray-800 bg-black/50 flex justify-between items-center hover:border-blue-500/30 transition-colors">
                        <div><p className="text-white font-bold text-sm truncate max-w-[120px]" title={lic.nome}>{lic.nome}</p><p className="text-xs text-gray-500">{lic.quantidade_total} und.</p></div>
                        <div className="text-right"><p className="text-sm font-bold text-blue-400">{formatCurrency(lic.custo * lic.quantidade_total)}</p></div>
                    </div>
                ))}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 mt-6">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col h-[350px] transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <h2 className="text-lg font-bold text-white mb-6">Colaboradores por Departamento (Ativos)</h2>
          <div className="flex-1 w-full h-full">
            {deptChartData.length === 0 ? (<div className="flex items-center justify-center h-full text-gray-500 italic text-sm">Nenhum colaborador ativo.</div>) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <RechartsTooltip cursor={{fill: '#1F2937'}} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} />
                  <Bar dataKey="count" name="Colaboradores" radius={[4, 4, 0, 0]} barSize={40}>
                      {deptChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'][index % 6]} />
                      ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl col-span-1 lg:col-span-2 shadow-xl flex flex-col h-[350px] transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white">Contratos (Mês a Mês)</h2>
            {uniqueContractsList.length > 0 && (
              <select value={activeContractFilter} onChange={(e) => setDashContractFilter(e.target.value)} className="bg-black border border-gray-700 rounded-lg p-2 text-sm text-brandGreen outline-none cursor-pointer hover:border-brandGreen/50 transition-colors">
                <option value="Todos">Exibir Todos</option>
                {uniqueContractsList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>
          <div className="flex-1 w-full h-full">
            {contractChartData.length === 0 ? (<div className="flex items-center justify-center h-full text-gray-500 italic text-sm">Sem medições.</div>) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={contractChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `R$${val/1000}k`} />
                  <RechartsTooltip cursor={{fill: '#1F2937'}} contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', color: '#fff' }} formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }}/>
                  <Bar dataKey="Previsto" fill="#4B5563" radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="Realizado" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-gray-900/80 backdrop-blur border border-red-900/30 p-6 rounded-3xl col-span-1 shadow-xl flex flex-col h-[350px] transition-all duration-300 hover:shadow-[0_10px_25px_rgba(239,68,68,0.1)] hover:border-red-900/50">
          <h2 className="text-lg font-bold text-red-400 mb-4">Radar de Garantias</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {expiringAssets.length === 0 ? (<p className="text-sm text-gray-500 text-center mt-10">Tudo OK.</p>) : (
              <div className="flex flex-col gap-3">
                {expiringAssets.map(asset => { 
                  let isExpired = false; let dateStrDisplay = ''; 
                  try { const dateStr = String(asset.notebook.garantia).substring(0, 10); const [y, m, d] = dateStr.split('-'); const garDate = new Date(y, m - 1, d); isExpired = garDate < today; dateStrDisplay = `${d}/${m}/${y}`; } catch {0} 
                  return (
                    <div key={asset.id} className={`p-4 rounded-xl border ${isExpired ? 'bg-red-900/20 border-red-900/50' : 'bg-yellow-900/20 border-yellow-900/50'} flex justify-between items-center transition-colors`}>
                      <div><p className="text-white font-bold text-sm">{asset.notebook.patrimonio}</p></div>
                      <div className="text-right"><p className={`text-xs font-bold ${isExpired ? 'text-red-400' : 'text-yellow-400'}`}>{isExpired ? 'VENCIDA' : 'Vence em breve'}</p><p className="text-xs text-gray-500">{dateStrDisplay}</p></div>
                    </div>
                  ); 
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}