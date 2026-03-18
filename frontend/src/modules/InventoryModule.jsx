import React, { useState } from 'react';
import { Database, Laptop, Smartphone, Wifi, Cpu, Search, X, ArrowDownAZ, ArrowUpZA, Trash2, MoreVertical, Info, Clock, CheckCircle, LogOut, ShieldAlert, AlertTriangle, Users } from 'lucide-react';
import { getAuthHeaders, formatCurrency } from '../utils/helpers';

export default function InventoryModule({ assets, employees, catalogItems, hasAccess, fetchData, requestConfirm, registerLog }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventorySortOrder, setInventorySortOrder] = useState('asc');
  const [assetStatusFilter, setAssetStatusFilter] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  // Estados dos Modais
  const getInitialAsset = (type) => ({ asset_type: type === 'Todos' ? 'Notebook' : type, status: 'Disponível', serial_number: '', patrimonio: '', modelo_notebook: '', garantia: '', status_garantia: 'No prazo', grupo: '', localizacao: '', email: '', senha: '', senha_roteador: '', responsavel: '', imei: '', numero: '', iccid: '', modelo_celular: '', plano: '' });
  const [newAsset, setNewAsset] = useState(getInitialAsset('Todos'));
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [viewAssetDetails, setViewAssetDetails] = useState(null);
  const [activeAsset, setActiveAsset] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isAssignAssetModalOpen, setIsAssignAssetModalOpen] = useState(false);
  const [selectedItemForAssign, setSelectedItemForAssign] = useState('');
  
  // CORREÇÃO: Removidos estados de manutenção orfãos que estavam quebrando a tela.
  const [statusModalData, setStatusModalData] = useState(null);

  // Filtragem e Ordenação com segurança (assets pode ser nulo)
  const safeAssets = assets || [];
  let filteredAssets = safeAssets.filter(a => { 
    if (!a) return false;
    const matchCategory = selectedCategory === 'Todos' ? true : a.asset_type === selectedCategory; 
    const matchStatus = assetStatusFilter === 'Todos' ? true : a.status === assetStatusFilter; 
    return matchCategory && matchStatus; 
  });
  
  if (inventorySearchTerm) { 
    const term = inventorySearchTerm.toLowerCase(); 
    filteredAssets = filteredAssets.filter(a => (
      a?.notebook?.patrimonio?.toLowerCase().includes(term) || 
      a?.notebook?.serial_number?.toLowerCase().includes(term) || 
      a?.celular?.imei?.toLowerCase().includes(term) || 
      a?.chip?.numero?.toLowerCase().includes(term) || 
      a?.starlink?.grupo?.toLowerCase().includes(term)
    )); 
  }
  
  filteredAssets.sort((a, b) => { 
    const getIdent = (asset) => asset?.notebook?.patrimonio || asset?.celular?.imei || asset?.chip?.numero || asset?.starlink?.grupo || ''; 
    const valA = getIdent(a).toLowerCase(); const valB = getIdent(b).toLowerCase(); 
    return inventorySortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA); 
  });

  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const toggleAll = () => selectedIds.length === filteredAssets.length && filteredAssets.length > 0 ? setSelectedIds([]) : setSelectedIds(filteredAssets.map(item => item.id));

  // Funções de API
  const handleCreateAsset = async (e) => { 
    e.preventDefault(); 
    const statusInicial = newAsset.grupo?.trim() ? 'Em uso' : 'Disponível'; 
    try {
      const res = await fetch('http://localhost:8080/api/assets', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({...newAsset, status: statusInicial}) });
      if(!res.ok) throw new Error((await res.json()).error || 'Erro ao criar');
      registerLog('CREATE', 'Inventário', `Cadastrou o ativo ${newAsset.asset_type}`); 
      setIsAssetModalOpen(false); 
      fetchData(); 
    } catch (err) { alert(err.message); }
  };

  const handleAction = (assetId, action) => { 
    setOpenActionMenu(null); // Fecha o menu antes de abrir o confirm
    requestConfirm('Confirmar Ação', `Tem certeza que deseja aplicar esta ação no equipamento?`, async () => { 
      try {
        const res = await fetch(`http://localhost:8080/api/assets/${assetId}/${action}`, { method: 'PUT', headers: getAuthHeaders() });
        if(!res.ok) throw new Error((await res.json()).error);
        registerLog('UPDATE', 'Inventário', `Ação ${action} no ativo ID ${assetId}`); 
        fetchData(); 
      } catch (err) { alert(err.message); }
    }, action === 'unassign' || action === 'discard', action === 'unassign' ? 'Devolver' : 'Confirmar'); 
  };

  const submitAssignment = async (e) => { 
    e.preventDefault(); 
    try {
      const res = await fetch(`http://localhost:8080/api/employees/${selectedItemForAssign}/assign`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ asset_id: activeAsset.id }) });
      if(!res.ok) throw new Error((await res.json()).error);
      registerLog('UPDATE', 'Inventário', `Atribuiu ativo ID ${activeAsset.id} ao colab ID ${selectedItemForAssign}`); 
      setIsAssignAssetModalOpen(false); 
      setSelectedItemForAssign(''); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const openStatusModal = (asset, newStatus) => { 
    setOpenActionMenu(null); 
    setStatusModalData({ asset: asset, status: newStatus, observacao: '' }); 
  };

  const submitStatusChange = async (e) => {
    e.preventDefault(); 
    if (statusModalData.observacao.trim() === '') { alert("A justificativa é obrigatória."); return; } 
    try {
      const res = await fetch(`http://localhost:8080/api/assets/${statusModalData.asset.id}/discard`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ status: statusModalData.status, observacao: statusModalData.observacao }) });
      if(!res.ok) throw new Error((await res.json()).error);
      registerLog('UPDATE', 'Baixas', `Status do ativo ${statusModalData.asset.id} alterado para ${statusModalData.status}`); 
      setStatusModalData(null); 
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    requestConfirm('Exclusão em Massa', `ATENÇÃO: Excluir DEFINITIVAMENTE ${selectedIds.length} itens?`, async () => {
        try {
            await Promise.all(selectedIds.map(async (id) => { 
              const res = await fetch(`http://localhost:8080/api/assets/${id}`, { method: 'DELETE', headers: getAuthHeaders() }); 
              if (!res.ok) throw new Error(`Falha no ID ${id}`); 
            }));
            registerLog('DELETE BULK', 'INVENTÁRIO', `Excluiu ${selectedIds.length} ativos.`); 
            setSelectedIds([]); 
            fetchData(); 
            alert('✅ Exclusão concluída!');
        } catch (err) { alert(`❌ Erro: ${err.message}`); }
    }, true, 'Excluir Selecionados');
  };

  return (
    <div className="flex gap-8 items-start animate-fade-in">
      <div className="w-64 flex-shrink-0 flex flex-col gap-3">
        {hasAccess('inventory', 'edit') && (
          <button onClick={() => { setNewAsset(getInitialAsset(selectedCategory)); setIsAssetModalOpen(true); }} className="mb-4 bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-3 rounded-2xl font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all w-full text-center">+ Novo Ativo</button>
        )}
        {[{ name: 'Todos', icon: <Database className="w-5 h-5" /> }, { name: 'Notebook', icon: <Laptop className="w-5 h-5" /> }, { name: 'Celular', icon: <Smartphone className="w-5 h-5" /> }, { name: 'Starlink', icon: <Wifi className="w-5 h-5" /> }, { name: 'CHIP', icon: <Cpu className="w-5 h-5" /> }].map(cat => (
          <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left font-medium transition-all border ${selectedCategory === cat.name ? 'bg-gray-800 text-brandGreen border-brandGreen/30' : 'text-gray-400 hover:bg-gray-900 hover:text-white border-transparent'}`}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-4 gap-4">
          <div className="flex-1 flex items-center gap-3 bg-gray-900/80 border border-gray-700 rounded-full px-4 py-2.5 focus-within:border-brandGreen transition-colors">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar por Patrimônio, Serial, IMEI, Número..." value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
            {inventorySearchTerm && <button onClick={() => setInventorySearchTerm('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setInventorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="bg-gray-900/80 border border-gray-700 hover:bg-gray-800 text-gray-300 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
              {inventorySortOrder === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />} Ordenar
            </button>
            <select value={assetStatusFilter} onChange={(e) => setAssetStatusFilter(e.target.value)} className="bg-gray-900/80 border border-gray-700 rounded-xl p-2.5 text-sm text-white outline-none">
              <option value="Todos">Todos os Status</option><option value="Disponível">Disponível</option><option value="Em uso">Em uso</option><option value="Manutenção">Manutenção</option><option value="Inutilizado">Inutilizado</option><option value="Extraviado/Roubado">Extraviado/Roubado</option><option value="Descartado">Descartado</option>
            </select>
          </div>
        </div>
        
        {selectedIds.length > 0 && hasAccess('inventory', 'edit') && (
          <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-2xl mb-4 flex justify-between items-center relative z-10">
            <span className="text-white font-bold">{selectedIds.length} ativo(s) selecionado(s)</span>
            <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Trash2 className="w-5 h-5" /> Excluir</button>
          </div>
        )}

        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl overflow-hidden min-h-[400px]">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/60 border-b border-gray-800 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 w-12">{hasAccess('inventory', 'edit') && <input type="checkbox" checked={selectedIds.length === filteredAssets.length && filteredAssets.length > 0} onChange={toggleAll} className="accent-brandGreen cursor-pointer w-4 h-4" />}</th>
                <th className="px-6 py-4">Equipamento</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Identificador</th><th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {assets && filteredAssets.length > 0 ? filteredAssets.map(asset => { 
                if (!asset) return null;
                const activeAsg = asset.assignments?.find(a => !a.returned_at); 
                const ownerName = activeAsg?.employee?.nome; 
                let catModel = asset.notebook?.modelo || asset.celular?.modelo || asset.starlink?.modelo || asset.chip?.plano || '';
                const mappedCatalog = (catalogItems || []).find(c => c.category === asset.asset_type && c.nome?.toLowerCase() === catModel?.toLowerCase());

                return (
                  <tr key={asset.id} className="hover:bg-gray-800/80">
                    <td className="px-6 py-4">{hasAccess('inventory', 'edit') && <input type="checkbox" checked={selectedIds.includes(asset.id)} onChange={() => toggleSelection(asset.id)} className="accent-brandGreen cursor-pointer w-4 h-4" />}</td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">{asset.asset_type}</td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 border rounded-full text-[11px] font-bold uppercase ${asset.status === 'Disponível' ? 'border-brandGreen/30 text-brandGreen' : asset.status === 'Manutenção' ? 'border-yellow-500/30 text-yellow-500' : 'border-gray-600 text-gray-400'}`}>{asset.status}</span></td>
                    <td className="px-6 py-4">
                      {asset.asset_type === 'Notebook' && asset.notebook && (<div><p className="font-semibold text-gray-200">{asset.notebook.patrimonio}</p><p className="text-xs text-gray-500">SN: {asset.notebook.serial_number}</p></div>)}
                      {asset.asset_type === 'Celular' && asset.celular && (<div><p className="font-semibold text-gray-200">IMEI: {asset.celular.imei}</p><p className="text-xs text-gray-500">Mod: {asset.celular.modelo}</p></div>)}
                      {asset.asset_type === 'CHIP' && asset.chip && (<div><p className="font-semibold text-gray-200">Linha: {asset.chip.numero}</p><p className="text-xs text-gray-500">Plano: {asset.chip.plano}</p></div>)}
                      {asset.asset_type === 'Starlink' && asset.starlink && (<div><p className="font-semibold text-gray-200">Grupo: {asset.starlink.grupo}</p><p className="text-xs text-gray-500">Local: {asset.starlink.localizacao}</p></div>)}
                      {ownerName && <p className="text-xs text-brandGreen font-semibold mt-1 flex items-center gap-1"><Users className="w-3 h-3"/> {ownerName}</p>}
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button onClick={() => setOpenActionMenu(openActionMenu === asset.id ? null : asset.id)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-500 hover:text-white"><MoreVertical className="w-5 h-5" /></button>
                      {openActionMenu === asset.id && (
                        <div className="absolute right-8 top-10 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-40 py-2 text-left animate-fade-in-up">
                          <button onClick={() => { setOpenActionMenu(null); setViewAssetDetails({...asset, catalogValue: mappedCatalog?.valor}); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><Info className="w-4 h-4 text-blue-400"/> Detalhes</button>
                          <button onClick={() => { setOpenActionMenu(null); setActiveAsset(asset); setIsHistoryModalOpen(true); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><Clock className="w-4 h-4 text-purple-400"/> Histórico</button>
                          {hasAccess('inventory', 'edit') && !['Descartado', 'Inutilizado', 'Extraviado/Roubado'].includes(asset.status) && (
                            <>
                              <div className="border-t border-gray-700 my-1"></div>
                              {asset.status === 'Disponível' && asset.asset_type !== 'Starlink' && <button onClick={() => { setOpenActionMenu(null); setActiveAsset(asset); setIsAssignAssetModalOpen(true); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><CheckCircle className="w-4 h-4 text-brandGreen"/> Atribuir a Alguém</button>}
                              {asset.status === 'Em uso' && <button onClick={() => handleAction(asset.id, 'unassign')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><LogOut className="w-4 h-4 text-red-400"/> Devolver para Estoque</button>}
                              {/* CORREÇÃO: Removido o botão de manutenção que quebrava a tela por faltar o modal local. Agora ele deve ser movido p/ manutenção via status (Maintenance tab). */}
                              {asset.status === 'Disponível' && (
                                <>
                                  <div className="border-t border-gray-700 my-1"></div>
                                  <button onClick={() => openStatusModal(asset, 'Inutilizado')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><ShieldAlert className="w-4 h-4 text-orange-400"/> Marcar Inutilizado</button>
                                  <button onClick={() => openStatusModal(asset, 'Extraviado/Roubado')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-red-500"/> Informar Extravio/Roubo</button>
                                  <button onClick={() => openStatusModal(asset, 'Descartado')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><Trash2 className="w-4 h-4 text-gray-500"/> Descartar</button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan="5" className="text-center py-20 text-gray-600 italic">Nenhum equipamento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAIS (HIGIENIZADOS) */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Novo Equipamento</h2><button onClick={() => setIsAssetModalOpen(false)} className="text-gray-400 hover:text-white"><X/></button></div>
            <form onSubmit={handleCreateAsset} className="flex flex-col gap-4">
              <input type="text" placeholder="Identificador / Serial" required value={newAsset.serial_number} onChange={(e) => setNewAsset({...newAsset, serial_number: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              <button type="submit" className="w-full bg-brandGreen text-white py-4 rounded-full font-bold mt-4">Salvar Ativo</button>
            </form>
          </div>
        </div>
      )}

      {isAssignAssetModalOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Atribuir Equipamento</h2><button onClick={() => setIsAssignAssetModalOpen(false)} className="text-gray-400 hover:text-white"><X/></button></div>
            <form onSubmit={submitAssignment} className="flex flex-col gap-4">
              <select required value={selectedItemForAssign} onChange={(e) => setSelectedItemForAssign(e.target.value)} className="w-full bg-black/50 border border-gray-700 hover:border-brandGreen/50 focus:border-brandGreen rounded-xl p-3 text-white outline-none cursor-pointer">
                <option value="" disabled>Escolha o Colaborador...</option>
                {employees?.filter(e => e.status !== 'Desligado').map(emp => (<option key={emp.id} value={emp.id}>{emp.nome}</option>))}
              </select>
              <button type="submit" className="w-full bg-brandGreen text-white py-4 rounded-full font-bold mt-4">Confirmar Atribuição</button>
            </form>
          </div>
        </div>
      )}

      {viewAssetDetails && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Detalhes do Ativo</h2>
              <button onClick={() => setViewAssetDetails(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <div className="bg-black/50 p-5 rounded-xl border border-gray-800">
              <p className="text-gray-300 mb-1">Tipo: <span className="font-bold text-white">{viewAssetDetails.asset_type}</span></p>
              <p className="text-gray-300 mb-1">Status: <span className="font-bold text-gray-100 uppercase text-xs px-2 py-0.5 bg-gray-700 rounded-full">{viewAssetDetails.status}</span></p>
              <p className="text-gray-300 mt-2 border-t border-gray-800 pt-2">Identificação: <span className="font-bold text-white">{viewAssetDetails.notebook?.patrimonio || viewAssetDetails.celular?.imei || viewAssetDetails.chip?.numero || viewAssetDetails.starlink?.grupo}</span></p>
              <div className="mt-4 pt-4 border-t border-gray-700">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Valuation (Catálogo Base)</p>
                <p className="text-xl font-bold text-brandGreen">
                  {viewAssetDetails.catalogValue ? formatCurrency(viewAssetDetails.catalogValue) : 'Não precificado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isHistoryModalOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Clock className="text-purple-400"/> Histórico de Donos</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-white p-2"><X className="w-6 h-6" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-4 custom-scrollbar pr-2">
              {activeAsset.assignments && activeAsset.assignments.length > 0 ? activeAsset.assignments.sort((a,b) => new Date(b.assigned_at) - new Date(a.assigned_at)).map((assignment, idx) => (
                <div key={idx} className="bg-black/50 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-gray-700 transition-colors">
                  <div><p className="text-brandGreen font-bold">{assignment.employee?.nome || 'Desconhecido'}</p><p className="text-xs text-gray-500">{assignment.employee?.email}</p></div>
                  <div className="text-right text-sm">
                    <p className="text-gray-300">Início: {new Date(assignment.assigned_at).toLocaleDateString('pt-BR')}</p>
                    <p className="text-blue-400 font-semibold">Fim: {assignment.returned_at ? new Date(assignment.returned_at).toLocaleDateString('pt-BR') : 'Em uso'}</p>
                  </div>
                </div>
              )) : <p className="text-center py-10 text-gray-600 italic">Nenhuma atribuição registrada.</p>}
            </div>
          </div>
        </div>
      )}

      {statusModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-red-900/50 rounded-3xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="text-red-500 w-6 h-6"/> Auditoria de Baixa</h2>
              <button onClick={() => setStatusModalData(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={submitStatusChange} className="flex flex-col gap-4">
              <textarea required value={statusModalData.observacao} onChange={(e) => setStatusModalData({...statusModalData, observacao: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white h-24 focus:border-red-500 outline-none transition-colors" placeholder="Descreva o motivo da baixa (danos, perda, roubo)..." />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setStatusModalData(null)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 transition-colors"><AlertTriangle className="w-4 h-4"/> Confirmar Baixa ({statusModalData.status})</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}