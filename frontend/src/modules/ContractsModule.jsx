import React, { useState } from 'react';
import { Search, X, Trash2, Edit2, FileText, CheckCircle, ExternalLink, Plus } from 'lucide-react';
import { getAuthHeaders, formatCurrency, parseCurrencyToFloat } from '../utils/helpers';

export default function ContractsModule({ contracts, hasAccess, fetchData, requestConfirm, registerLog }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]); // 👇 Estado de Seleção Múltipla
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [formData, setFormData] = useState({ servico: '', fornecedor: '', mes_competencia: '', valor_previsto: '', valor_realizado: '', url_contrato: '' });

  const filteredContracts = contracts.filter(c => 
    c.servico.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mes_competencia.includes(searchTerm)
  ).sort((a, b) => b.mes_competencia.localeCompare(a.mes_competencia));

  // 👇 Funções de Checkbox e Exclusão em Lote 👇
  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const toggleAll = () => selectedIds.length === filteredContracts.length && filteredContracts.length > 0 ? setSelectedIds([]) : setSelectedIds(filteredContracts.map(item => item.id));
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    requestConfirm('Exclusão em Massa', `ATENÇÃO: Excluir DEFINITIVAMENTE ${selectedIds.length} medições?`, async () => {
        try {
            await Promise.all(selectedIds.map(async (id) => { 
              const res = await fetch(`${API_BASE_URL}/api/contracts/${id}`, { method: 'DELETE', headers: getAuthHeaders() }); 
              if (!res.ok) throw new Error(`Falha no ID ${id}`); 
            }));
            registerLog('DELETE BULK', 'CONTRATOS', `Excluiu ${selectedIds.length} medições de contratos.`); 
            setSelectedIds([]); 
            fetchData(); 
        } catch (err) { alert(`❌ Erro: ${err.message}`); }
    }, true, 'Excluir Selecionados');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEdit = !!editData;
    const url = isEdit ? `${API_BASE_URL}/api/contracts/${editData.id}` : `${API_BASE_URL}/api/contracts`;
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
        ...formData,
        valor_previsto: parseCurrencyToFloat(formData.valor_previsto),
        valor_realizado: parseCurrencyToFloat(formData.valor_realizado)
    };

    try {
        const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
        if (!res.ok) throw new Error("Erro ao salvar medição");
        registerLog(isEdit ? 'UPDATE' : 'CREATE', 'Contratos', `${isEdit ? 'Editou' : 'Registrou'} medição de ${payload.servico}`);
        setIsModalOpen(false);
        setEditData(null);
        fetchData();
    } catch (err) { alert(err.message); }
  };

  const openEdit = (contract) => {
      setEditData(contract);
      setFormData({
          servico: contract.servico,
          fornecedor: contract.fornecedor,
          mes_competencia: contract.mes_competencia,
          valor_previsto: contract.valor_previsto.toString(),
          valor_realizado: contract.valor_realizado.toString(),
          url_contrato: contract.url_contrato || ''
      });
      setIsModalOpen(true);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 bg-gray-900/80 border border-gray-700 rounded-full px-4 py-2.5 w-full max-w-md focus-within:border-brandGreen transition-colors">
          <Search className="w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar serviço, fornecedor ou mês (Ex: 2026-03)..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>}
        </div>
        {hasAccess('contracts', 'edit') && (
          <button onClick={() => { setEditData(null); setFormData({ servico: '', fornecedor: '', mes_competencia: '', valor_previsto: '', valor_realizado: '', url_contrato: '' }); setIsModalOpen(true); }} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all flex items-center gap-2"><Plus size={18}/> Registrar Medição</button>
        )}
      </div>

      {/* 👇 Banner Vermelho de Exclusão em Massa 👇 */}
      {selectedIds.length > 0 && hasAccess('contracts', 'edit') && (
        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-2xl mb-4 flex justify-between items-center animate-fade-in">
          <span className="text-white font-bold flex items-center gap-2"><FileText className="w-5 h-5 text-red-500"/> {selectedIds.length} registro(s) selecionado(s)</span>
          <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"><Trash2 className="w-5 h-5" /> Excluir</button>
        </div>
      )}

      <div className="bg-gray-900/80 border border-gray-800 rounded-3xl min-h-[400px] overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-gray-400 border-b border-gray-800 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 w-12">{hasAccess('contracts', 'edit') && <input type="checkbox" checked={selectedIds.length === filteredContracts.length && filteredContracts.length > 0} onChange={toggleAll} className="accent-brandGreen cursor-pointer w-4 h-4" />}</th>
              <th className="px-6 py-4">Serviço / Fornecedor</th>
              <th className="px-6 py-4">Mês Ref.</th>
              <th className="px-6 py-4">Valor Previsto</th>
              <th className="px-6 py-4">Valor Realizado</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredContracts.map(c => (
              <tr key={c.id} className={`transition-colors ${selectedIds.includes(c.id) ? 'bg-brandGreen/5' : 'hover:bg-gray-800/80'}`}>
                <td className="px-6 py-4">{hasAccess('contracts', 'edit') && <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelection(c.id)} className="accent-brandGreen cursor-pointer w-4 h-4" />}</td>
                <td className="px-6 py-4">
                    <p className="font-bold text-white flex items-center gap-2">{c.servico} {c.url_contrato && <a href={c.url_contrato} target="_blank" rel="noopener noreferrer" title="Ver Documento"><ExternalLink className="w-3 h-3 text-blue-400 hover:text-blue-300" /></a>}</p>
                    <p className="text-xs text-gray-500 uppercase">{c.fornecedor}</p>
                </td>
                <td className="px-6 py-4"><span className="bg-gray-800 px-3 py-1 rounded-full text-xs font-semibold border border-gray-700">{c.mes_competencia}</span></td>
                <td className="px-6 py-4 text-gray-400">{formatCurrency(c.valor_previsto)}</td>
                <td className="px-6 py-4 font-bold text-white">{formatCurrency(c.valor_realizado)}</td>
                <td className="px-6 py-4 text-center">
                  {hasAccess('contracts', 'edit') && (
                    <button onClick={() => openEdit(c)} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-brandGreen transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                  )}
                </td>
              </tr>
            ))}
            {filteredContracts.length === 0 && <tr><td colSpan="6" className="text-center py-20 text-gray-500 italic">Nenhum contrato/medição encontrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">{editData ? 'Editar Medição' : 'Registrar Medição'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X/></button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <input type="text" required placeholder="Nome do Serviço" value={formData.servico} onChange={(e) => setFormData({...formData, servico: e.target.value})} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-xl p-3 text-white outline-none" />
              <input type="text" required placeholder="Fornecedor (Ex: DELL)" value={formData.fornecedor} onChange={(e) => setFormData({...formData, fornecedor: e.target.value})} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-xl p-3 text-white outline-none" />
              <input type="month" required value={formData.mes_competencia} onChange={(e) => setFormData({...formData, mes_competencia: e.target.value})} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-xl p-3 text-gray-300 outline-none" />
              
              <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Valor Previsto" value={formData.valor_previsto} onChange={(e) => setFormData({...formData, valor_previsto: e.target.value})} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-xl p-3 text-white outline-none text-sm" />
                  <input type="text" required placeholder="Valor Realizado" value={formData.valor_realizado} onChange={(e) => setFormData({...formData, valor_realizado: e.target.value})} className="bg-black/50 border border-brandGreen/50 focus:border-brandGreen rounded-xl p-3 text-white font-bold outline-none text-sm" />
              </div>
              <input type="url" placeholder="URL da Fatura / Contrato (Opcional)" value={formData.url_contrato} onChange={(e) => setFormData({...formData, url_contrato: e.target.value})} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-xl p-3 text-blue-400 outline-none text-sm" />

              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-4 shadow-lg transition-all">{editData ? 'Salvar Alterações' : 'Salvar Medição'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}