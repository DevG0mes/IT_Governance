import React, { useState, useMemo } from 'react';
import { FileSignature, Plus, MoreVertical, LinkIcon, Edit2, X, FileText, Zap, CheckCircle2 } from 'lucide-react';
import { getAuthHeaders, parseCurrencyToFloat } from '../utils/helpers';

export default function ContractsModule({ contracts, catalogItems, hasAccess, fetchData, formatCurrency }) {
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [contractMode, setContractMode] = useState('lancamento');
  const [tableContractFilter, setTableContractFilter] = useState('Todos');
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [editContractData, setEditContractData] = useState(null);
  const [newContract, setNewContract] = useState({ servico: '', fornecedor: '', mes_competencia: '', valor_previsto: '', valor_realizado: '', url_contrato: '' });

  const uniqueContractsList = useMemo(() => [...new Set(contracts.map(c => c.servico))].filter(Boolean), [contracts]);
  
  // Pega os serviços registrados no catálogo para auto-completar
  const catalogContracts = catalogItems?.filter(c => c.category === 'Contrato') || [];

  const handleExtractDataFromPDF = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('http://localhost:8080/api/contracts/analyze-pdf', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('jwt_token')}` },
        body: formData
      });
      if (!response.ok) throw new Error('Falha na análise');
      const data = await response.json();
      
      // AUTO-PREENCHIMENTO INTELIGENTE COM O CATÁLOGO
      let valorPrevistoSugerido = '';
      const servicoNoCatalogo = catalogContracts.find(c => c.nome.toLowerCase() === (data.servico || '').toLowerCase());
      if (servicoNoCatalogo) {
          valorPrevistoSugerido = servicoNoCatalogo.valor;
      }

      setNewContract({
        ...newContract,
        fornecedor: data.fornecedor || '',
        servico: data.servico || '',
        valor_realizado: data.valor_realizado || '',
        mes_competencia: data.mes_competencia || '',
        valor_previsto: valorPrevistoSugerido
      });
      alert(`Dados extraídos: ${data.fornecedor}`);
    } catch (err) {
      alert("Erro ao processar PDF. Verifique o backend.", err);
    }
  };

  const handleSaveContract = async (e) => {
    if (e) e.preventDefault();
    if (!newContract.servico || !newContract.valor_realizado) { alert("Preencha os campos obrigatórios."); return; }
    try {
      const method = editContractData ? 'PUT' : 'POST';
      const url = editContractData ? `http://localhost:8080/api/contracts/${editContractData.id}` : 'http://localhost:8080/api/contracts';
      const payload = editContractData ? { ...editContractData, valor_previsto: parseCurrencyToFloat(editContractData.valor_previsto), valor_realizado: parseCurrencyToFloat(editContractData.valor_realizado) } : { ...newContract, valor_previsto: parseCurrencyToFloat(newContract.valor_previsto), valor_realizado: parseCurrencyToFloat(newContract.valor_realizado) };
      
      const response = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if (response.ok) {
        fetchData();
        setIsContractModalOpen(false);
        setEditContractData(null);
        setNewContract({ servico: '', fornecedor: '', mes_competencia: '', valor_previsto: '', valor_realizado: '', url_contrato: '' });
      } else { alert("Erro ao salvar."); }
    } catch (error) { console.error("Erro:", error); }
  };

  const handleContractServiceSelect = (servicoName) => {
    // 1. Tenta achar o valor no Catálogo primeiro (Prioridade)
    const servicoNoCatalogo = catalogContracts.find(c => c.nome === servicoName);
    
    // 2. Se não achar no catálogo, pega da última medição feita
    const base = contracts.find(c => c.servico === servicoName);
    
    if (base) {
      setNewContract(prev => ({ 
        ...prev, 
        servico: base.servico, 
        fornecedor: base.fornecedor, 
        valor_previsto: servicoNoCatalogo ? servicoNoCatalogo.valor : base.valor_previsto, // Usa o catálogo se existir
        url_contrato: base.url_contrato 
      }));
    } else if (servicoNoCatalogo) {
      setNewContract(prev => ({ ...prev, servico: servicoName, valor_previsto: servicoNoCatalogo.valor }));
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><FileSignature className="text-brandGreen"/> Gestão de Contratos</h2>
          <p className="text-xs text-gray-500 ml-8">Controle financeiro e medições de serviços de TI</p>
        </div>
        <div className="flex gap-4">
          {uniqueContractsList.length > 0 && (
            <select value={tableContractFilter} onChange={(e) => setTableContractFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-sm text-brandGreen font-bold outline-none cursor-pointer hover:border-brandGreen/50 transition-colors">
              <option value="Todos">Exibir Todos</option>
              {uniqueContractsList.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {hasAccess('contracts', 'edit') && (
            <button onClick={() => { setContractMode('lancamento'); setNewContract({ servico: '', fornecedor: '', mes_competencia: '', valor_previsto: '', valor_realizado: '', url_contrato: '' }); setIsContractModalOpen(true); }} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all duration-300 flex items-center gap-2">
              <Plus className="w-5 h-5"/> Registrar Medição
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-3xl shadow-xl min-h-[400px] overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-gray-400 border-b border-gray-800 uppercase text-xs font-semibold">
            <tr><th className="px-6 py-4 text-brandGreen">Serviço / Fornecedor</th><th className="px-6 py-4">Mês Ref.</th><th className="px-6 py-4">Valor Previsto</th><th className="px-6 py-4">Valor Realizado</th><th className="px-6 py-4 text-center">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {contracts.filter(c => tableContractFilter === 'Todos' || c.servico === tableContractFilter).map(c => (
              <tr key={c.id} className="hover:bg-gray-800/80 transition-colors duration-200 group">
                <td className="px-6 py-4"><p className="font-bold text-white group-hover:text-brandGreen transition-colors">{c.servico}</p><p className="text-xs text-gray-500 font-normal uppercase">{c.fornecedor}</p></td>
                <td className="px-6 py-4"><span className="bg-gray-800 text-brandGreen px-3 py-1 rounded-full font-mono text-xs border border-gray-700">{c.mes_competencia}</span></td>
                <td className="px-6 py-4 text-gray-400 font-mono">{formatCurrency(c.valor_previsto)}</td>
                <td className="px-6 py-4"><div className={`font-bold font-mono ${parseFloat(c.valor_realizado) > parseFloat(c.valor_previsto) ? 'text-red-400' : 'text-white'}`}>{formatCurrency(c.valor_realizado)}</div></td>
                <td className="px-6 py-4 text-center relative">
                  <button onClick={() => setOpenActionMenu(openActionMenu === `contract-${c.id}` ? null : `contract-${c.id}`)} className="p-2 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg"><MoreVertical className="w-5 h-5" /></button>
                  {openActionMenu === `contract-${c.id}` && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setOpenActionMenu(null)}></div>
                      <div className="absolute right-8 top-10 w-56 bg-gray-900 border border-gray-700 rounded-2xl z-40 py-2 shadow-2xl text-left overflow-hidden">
                        <div className="px-4 py-2 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-800 mb-1">Opções de Medição</div>
                        {c.url_contrato && (<a href={c.url_contrato} target="_blank" rel="noreferrer" className="w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-brandGreen/10 hover:text-brandGreen flex items-center gap-3 transition-colors"><LinkIcon className="w-4 h-4 text-blue-400"/> Ver PDF</a>)}
                        {hasAccess('contracts', 'edit') && (<button onClick={() => { setOpenActionMenu(null); setEditContractData(c); setIsContractModalOpen(true); }} className="w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-yellow-400/10 hover:text-yellow-400 flex items-center gap-3 transition-colors"><Edit2 className="w-4 h-4 text-yellow-400"/> Editar Medição</button>)}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isContractModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-950 border border-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-black px-8 py-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><FileText className="text-brandGreen"/> {contractMode === 'lancamento' ? 'Nova Medição' : 'Editar Medição'}</h3>
              <button onClick={() => {setIsContractModalOpen(false); setEditContractData(null);}} className="text-gray-500 hover:text-white transition-colors"><X/></button>
            </div>
            <div className="p-8 space-y-6">
              {!editContractData && (
                <div className="flex gap-2 mb-2 bg-black/50 p-1 rounded-xl border border-gray-800">
                  <button onClick={() => setContractMode('lancamento')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${contractMode === 'lancamento' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>Lançar Medição</button>
                  <button onClick={() => setContractMode('novo')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${contractMode === 'novo' ? 'bg-gray-800 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}>Novo Contrato</button>
                </div>
              )}
              {contractMode === 'lancamento' && !editContractData && (
                <div className="group relative border-2 border-dashed border-gray-800 hover:border-brandGreen/50 bg-gray-900/50 p-6 rounded-2xl transition-all duration-300 text-center">
                  <input type="file" accept=".pdf" id="pdf-extractor" className="hidden" onChange={(e) => handleExtractDataFromPDF(e.target.files[0])} />
                  <label htmlFor="pdf-extractor" className="cursor-pointer flex flex-col items-center gap-2">
                    <div className="bg-brandGreen/10 p-3 rounded-full group-hover:scale-110 transition-transform"><Zap className="text-brandGreen w-6 h-6 animate-pulse"/></div>
                    <span className="text-sm font-bold text-white">Auto-Preencher via PDF</span>
                  </label>
                </div>
              )}
              <form onSubmit={handleSaveContract} className="flex flex-col gap-4">
                {contractMode === 'lancamento' && !editContractData ? (
                  <select required value={newContract.servico} onChange={(e) => handleContractServiceSelect(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors cursor-pointer">
                    <option value="" disabled>Escolha o Serviço...</option>
                    {/* Exibe serviços do catálogo + histórico de medições */}
                    {[...new Set([...catalogContracts.map(c=>c.nome), ...uniqueContractsList])].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required placeholder="Serviço" value={editContractData ? editContractData.servico : newContract.servico} onChange={(e) => handleContractServiceSelect(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" disabled={contractMode === 'lancamento' && !editContractData}/>
                    <input type="text" required placeholder="Fornecedor" value={editContractData ? editContractData.fornecedor : newContract.fornecedor} onChange={(e) => editContractData ? setEditContractData({...editContractData, fornecedor: e.target.value}) : setNewContract({...newContract, fornecedor: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" disabled={contractMode === 'lancamento' && !editContractData}/>
                  </div>
                )}
                <input type="month" required value={editContractData ? editContractData.mes_competencia : newContract.mes_competencia} onChange={(e) => editContractData ? setEditContractData({...editContractData, mes_competencia: e.target.value}) : setNewContract({...newContract, mes_competencia: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" required value={editContractData ? editContractData.valor_previsto : newContract.valor_previsto} onChange={(e) => editContractData ? setEditContractData({...editContractData, valor_previsto: e.target.value}) : setNewContract({...newContract, valor_previsto: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" placeholder="Previsto R$" disabled={contractMode === 'lancamento' && !editContractData}/>
                  <input type="text" required value={editContractData ? editContractData.valor_realizado : newContract.valor_realizado} onChange={(e) => editContractData ? setEditContractData({...editContractData, valor_realizado: e.target.value}) : setNewContract({...newContract, valor_realizado: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" placeholder="Realizado R$" />
                </div>
                <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold shadow-lg hover:-translate-y-1 transition-all duration-300">Salvar Medição</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}