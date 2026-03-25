import React, { useState } from 'react';
import { Database, Laptop, Smartphone, Wifi, Cpu, Search, X, ArrowDownAZ, ArrowUpZA, Trash2, MoreVertical, Info, Clock, CheckCircle, LogOut, ShieldAlert, AlertTriangle, Users, Wrench, RefreshCw, Loader2, Edit2, UserPlus } from 'lucide-react';
import { getAuthHeaders, formatCurrency } from '../utils/helpers';

export default function InventoryModule({ assets, employees, catalogItems, hasAccess, fetchData, requestConfirm, registerLog, isLoading }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventorySortOrder, setInventorySortOrder] = useState('asc');
  const [assetStatusFilter, setAssetStatusFilter] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  const getInitialAsset = (type) => ({ asset_type: type === 'Todos' ? 'Notebook' : type, status: 'Disponível', serial_number: '', patrimonio: '', modelo_notebook: '', garantia: '', status_garantia: 'No prazo', grupo: '', localizacao: '', projeto: '', modelo_starlink: '', email: '', senha: '', senha_roteador: '', responsavel: '', imei: '', numero: '', iccid: '', modelo_celular: '', plano: '', vencimento_plano: '' });
  const [newAsset, setNewAsset] = useState(getInitialAsset('Todos'));
  
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isEditingAsset, setIsEditingAsset] = useState(false); 
  const [activeAsset, setActiveAsset] = useState(null);
  
  const [viewAssetDetails, setViewAssetDetails] = useState(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [isAssignAssetModalOpen, setIsAssignAssetModalOpen] = useState(false);
  const [selectedItemForAssign, setSelectedItemForAssign] = useState('');
  const [newEmployeeForAssign, setNewEmployeeForAssign] = useState({ nome: '', email: '', departamento: '' });
  
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({ chamado: '', observacao: '' });
  const [statusModalData, setStatusModalData] = useState(null);
// Substitua temporariamente a linha por esta (com a URL real do seu backend):
  const API_BASE_URL = 'https://silver-monkey-552153.hostingersite.com';  
  const extractError = async (res, defaultMsg) => {
    try { const data = await res.json(); return data.error || defaultMsg; } 
    catch (e) { return `${defaultMsg} (Erro no Servidor. Verifique o terminal do Go ou Banco de Dados)`, e; }
  };

  const safeAssets = assets || [];
  
  let filteredAssets = safeAssets.filter(a => { 
    if (!a) return false;
    const assetType = (a.asset_type || '').trim().toLowerCase();
    const targetCategory = selectedCategory.trim().toLowerCase();
    const matchCategory = selectedCategory === 'Todos' ? true : assetType === targetCategory; 
    const assetStatus = (a.status || '').trim().toLowerCase();
    const targetStatus = assetStatusFilter.trim().toLowerCase();
    const matchStatus = assetStatusFilter === 'Todos' ? true : assetStatus === targetStatus; 
    return matchCategory && matchStatus; 
  });
  
  if (inventorySearchTerm) { 
    const term = inventorySearchTerm.toLowerCase(); 
    filteredAssets = filteredAssets.filter(a => (
      a?.notebook?.patrimonio?.toLowerCase().includes(term) || 
      a?.notebook?.serial_number?.toLowerCase().includes(term) || 
      a?.celular?.imei?.toLowerCase().includes(term) || 
      a?.chip?.numero?.toLowerCase().includes(term) || 
      a?.chip?.iccid?.toLowerCase().includes(term) || 
      a?.starlink?.grupo?.toLowerCase().includes(term) ||
      a?.starlink?.projeto?.toLowerCase().includes(term) ||
      a?.celular?.grupo?.toLowerCase().includes(term) ||
      a?.chip?.grupo?.toLowerCase().includes(term)
    )); 
  }
  
  filteredAssets.sort((a, b) => { 
    const getIdent = (asset) => asset?.notebook?.patrimonio || asset?.celular?.imei || asset?.chip?.numero || asset?.starlink?.grupo || ''; 
    const valA = getIdent(a).toLowerCase(); const valB = getIdent(b).toLowerCase(); 
    return inventorySortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA); 
  });

  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const toggleAll = () => selectedIds.length === filteredAssets.length && filteredAssets.length > 0 ? setSelectedIds([]) : setSelectedIds(filteredAssets.map(item => item.id));

  const openEditModal = (asset) => {
      const flatAsset = {
          id: asset.id,
          asset_type: asset.asset_type,
          status: asset.status,
          patrimonio: asset.notebook?.patrimonio || '',
          serial_number: asset.notebook?.serial_number || '',
          modelo_notebook: asset.notebook?.modelo || '',
          garantia: asset.notebook?.garantia || '',
          status_garantia: asset.notebook?.status_garantia || 'No prazo',
          imei: asset.celular?.imei || '',
          modelo_celular: asset.celular?.modelo || '',
          numero: asset.chip?.numero || '',
          iccid: asset.chip?.iccid || '',
          plano: asset.chip?.plano || '',
          vencimento_plano: asset.chip?.vencimento_plano || '',
          localizacao: asset.starlink?.localizacao || '',
          projeto: asset.starlink?.projeto || '',
          modelo_starlink: asset.starlink?.modelo || '',
          email: asset.starlink?.email || '',
          senha: asset.starlink?.senha || '',
          senha_roteador: asset.starlink?.senha_roteador || '',
          grupo: asset.celular?.grupo || asset.chip?.grupo || asset.starlink?.grupo || '',
          responsavel: asset.celular?.responsavel || asset.chip?.responsavel || asset.starlink?.responsavel || ''
      };
      setNewAsset(flatAsset);
      setIsEditingAsset(true);
      setActiveAsset(asset);
      setIsAssetModalOpen(true);
  };

  const handleCreateAsset = async (e) => { 
    e.preventDefault(); 
    const statusInicial = newAsset.grupo?.trim() && !['Renovação', 'Manutenção'].includes(newAsset.status) ? 'Em uso' : newAsset.status; 
    try {
      const res = await fetch(`${API_BASE_URL}/api/assets`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({...newAsset, status: statusInicial}) });
      if(!res.ok) throw new Error(await extractError(res, 'Erro ao criar equipamento'));
      
      registerLog('CREATE', 'Inventário', `Cadastrou o ativo ${newAsset.asset_type}`); 
      setIsAssetModalOpen(false); 
      fetchData(); 
    } catch (err) { alert(err.message); }
  };

  const handleUpdateAsset = async (e) => {
    e.preventDefault();
    try {
        const res = await fetch(`${API_BASE_URL}/api/assets/${activeAsset.id}`, { 
            method: 'PUT', 
            headers: getAuthHeaders(), 
            body: JSON.stringify(newAsset) 
        });
        if (!res.ok) throw new Error(await extractError(res, 'Erro ao atualizar equipamento'));
        
        registerLog('UPDATE', 'Inventário', `Atualizou os dados do ativo ID ${activeAsset.id}`);
        setIsAssetModalOpen(false);
        setIsEditingAsset(false);
        fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleAction = (assetId, action) => { 
    setOpenActionMenu(null); 
    requestConfirm('Confirmar Ação', `Deseja aplicar esta ação no equipamento?`, async () => { 
      try {
        const res = await fetch(`${API_BASE_URL}/api/assets/${assetId}/${action}`, { method: 'PUT', headers: getAuthHeaders() });
        if(!res.ok) throw new Error(await extractError(res, 'Erro ao aplicar ação'));
        
        registerLog('UPDATE', 'Inventário', `Ação ${action} no ativo ID ${assetId}`); 
        fetchData(); 
      } catch (err) { alert(err.message); }
    }, action === 'unassign' || action === 'discard', action === 'unassign' ? 'Devolver' : 'Confirmar'); 
  };

  const submitAssignment = async (e) => { 
    e.preventDefault(); 
    try {
      let targetEmpId = selectedItemForAssign;

      if (targetEmpId === 'NEW') {
          const createRes = await fetch(`${API_BASE_URL}/api/employees`, { 
              method: 'POST', 
              headers: getAuthHeaders(), 
              body: JSON.stringify(newEmployeeForAssign) 
          });
          if (!createRes.ok) throw new Error(await extractError(createRes, "Erro ao cadastrar o novo colaborador."));
          const createData = await createRes.json();
          targetEmpId = createData.data.id; 
          registerLog('CREATE', 'Colaboradores', `Cadastrou funcionário ${newEmployeeForAssign.nome} via Atribuição`);
      }

      const res = await fetch(`${API_BASE_URL}/api/employees/${targetEmpId}/assign`, { 
          method: 'PUT', 
          headers: getAuthHeaders(), 
          body: JSON.stringify({ asset_id: activeAsset.id }) 
      });
      if(!res.ok) throw new Error(await extractError(res, "Erro ao atribuir equipamento"));
      
      registerLog('UPDATE', 'Inventário', `Atribuiu ativo ID ${activeAsset.id} ao colab ID ${targetEmpId}`); 
      setIsAssignAssetModalOpen(false); 
      setSelectedItemForAssign(''); 
      setNewEmployeeForAssign({nome: '', email: '', departamento: ''});
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const submitMaintenance = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/assets/${activeAsset.id}/maintenance`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(maintenanceForm) });
      if(!res.ok) throw new Error(await extractError(res, 'Erro ao enviar para manutenção'));
      
      registerLog('UPDATE', 'Manutenção', `Enviou ativo ID ${activeAsset.id} p/ conserto`); 
      setIsMaintenanceModalOpen(false); 
      setMaintenanceForm({chamado: '', observacao: ''}); 
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const openStatusModal = (asset, newStatus) => { 
    setOpenActionMenu(null); 
    setStatusModalData({ asset: asset, status: newStatus, observacao: '' }); 
  };

  const submitStatusChange = async (e) => {
    e.preventDefault(); 
    if (statusModalData.observacao.trim() === '') { alert("A justificativa é obrigatória."); return; } 
    try {
      const res = await fetch(`${API_BASE_URL}/api/assets/${statusModalData.asset.id}/discard`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ status: statusModalData.status, observacao: statusModalData.observacao }) });
      if(!res.ok) throw new Error(await extractError(res, 'Erro ao alterar status'));
      
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
              const res = await fetch(`${API_BASE_URL}/api/assets/${id}`, { method: 'DELETE', headers: getAuthHeaders() }); 
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
    <div className="flex flex-col lg:flex-row gap-8 items-start animate-fade-in">
      <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-3">
        {hasAccess('inventory', 'edit') && (
          <button onClick={() => { setIsEditingAsset(false); setNewAsset(getInitialAsset(selectedCategory)); setIsAssetModalOpen(true); }} className="mb-4 bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-3 rounded-2xl font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all w-full text-center hover:-translate-y-1">+ Novo Ativo</button>
        )}
        {[{ name: 'Todos', icon: <Database className="w-5 h-5" /> }, { name: 'Notebook', icon: <Laptop className="w-5 h-5" /> }, { name: 'Celular', icon: <Smartphone className="w-5 h-5" /> }, { name: 'Starlink', icon: <Wifi className="w-5 h-5" /> }, { name: 'CHIP', icon: <Cpu className="w-5 h-5" /> }].map(cat => (
          <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left font-medium transition-all border ${selectedCategory === cat.name ? 'bg-gray-800 text-brandGreen border-brandGreen/30 shadow-lg' : 'text-gray-400 hover:bg-gray-900 hover:text-white border-transparent'}`}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="w-full md:flex-1 flex items-center gap-3 bg-gray-900/80 border border-gray-700 rounded-full px-4 py-2.5 focus-within:border-brandGreen transition-colors">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar Patrimônio, Grupo, ICCID, Projeto..." value={inventorySearchTerm} onChange={(e) => setInventorySearchTerm(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
            {inventorySearchTerm && <button onClick={() => setInventorySearchTerm('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>}
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <button onClick={() => setInventorySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="bg-gray-900/80 border border-gray-700 hover:bg-gray-800 text-gray-300 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-colors">
              {inventorySortOrder === 'asc' ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpZA className="w-4 h-4" />} Ordenar
            </button>
            <select value={assetStatusFilter} onChange={(e) => setAssetStatusFilter(e.target.value)} className="flex-1 md:flex-none bg-gray-900/80 border border-gray-700 rounded-xl p-2.5 text-sm text-white outline-none cursor-pointer focus:border-brandGreen transition-colors">
              <option value="Todos">Todos os Status</option>
              <option value="Disponível">Disponível</option>
              <option value="Em uso">Em uso</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Renovação">Renovação</option>
              <option value="Inutilizado">Inutilizado</option>
              <option value="Extraviado/Roubado">Extraviado/Roubado</option>
              <option value="Descartado">Descartado</option>
            </select>
          </div>
        </div>
        
        {selectedIds.length > 0 && hasAccess('inventory', 'edit') && (
          <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-2xl mb-4 flex justify-between items-center relative z-10 animate-fade-in">
            <span className="text-white font-bold">{selectedIds.length} ativo(s) selecionado(s)</span>
            <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"><Trash2 className="w-5 h-5" /> Excluir</button>
          </div>
        )}

        {/* Removido o overflow-hidden para não cortar o menu */}
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl min-h-[400px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20">
              <Loader2 className="w-12 h-12 text-brandGreen animate-spin mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <p className="text-brandGreen font-bold animate-pulse tracking-widest uppercase text-sm">Atualizando Dados...</p>
            </div>
          ) : null}

          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/60 border-b border-gray-800 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 w-12 rounded-tl-3xl">{hasAccess('inventory', 'edit') && <input type="checkbox" checked={selectedIds.length === filteredAssets.length && filteredAssets.length > 0} onChange={toggleAll} className="accent-brandGreen cursor-pointer w-4 h-4" />}</th>
                <th className="px-6 py-4">Equipamento</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Identificador / Grupo</th><th className="px-6 py-4 text-center rounded-tr-3xl">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {assets && filteredAssets.length > 0 ? filteredAssets.map((asset, idx) => { 
                if (!asset) return null;
                const activeAsg = asset.assignments?.find(a => !a.returned_at); 
                const ownerName = activeAsg?.employee?.nome || asset.celular?.responsavel || asset.chip?.responsavel || asset.starlink?.responsavel; 
                const groupName = asset.celular?.grupo || asset.chip?.grupo || asset.starlink?.grupo;
                let catModel = asset.notebook?.modelo || asset.celular?.modelo || asset.starlink?.modelo || asset.chip?.plano || '';
                const mappedCatalog = (catalogItems || []).find(c => c.category === asset.asset_type && c.nome?.toLowerCase() === catModel?.toLowerCase());

                // 👇 Lógica Inteligente: Se for uma das últimas linhas da tabela, o menu abre para CIMA 👇
                const isLastRows = idx >= filteredAssets.length - 2 && filteredAssets.length > 2;
                const menuPositionClass = isLastRows ? "bottom-10 right-8 origin-bottom-right" : "top-10 right-8 origin-top-right";

                return (
                  <tr key={asset.id} className="hover:bg-gray-800/80 transition-colors">
                    <td className="px-6 py-4">{hasAccess('inventory', 'edit') && <input type="checkbox" checked={selectedIds.includes(asset.id)} onChange={() => toggleSelection(asset.id)} className="accent-brandGreen cursor-pointer w-4 h-4" />}</td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">{asset.asset_type}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 border rounded-full text-[11px] font-bold uppercase ${asset.status === 'Disponível' ? 'border-brandGreen/30 text-brandGreen' : asset.status === 'Manutenção' ? 'border-yellow-500/30 text-yellow-500' : asset.status === 'Renovação' ? 'border-blue-500/30 text-blue-400' : 'border-gray-600 text-gray-400'}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {asset.asset_type === 'Notebook' && asset.notebook && (<div><p className="font-semibold text-gray-200">{asset.notebook.patrimonio}</p><p className="text-xs text-gray-500">SN: {asset.notebook.serial_number}</p></div>)}
                      {asset.asset_type === 'Celular' && asset.celular && (<div><p className="font-semibold text-gray-200">IMEI: {asset.celular.imei}</p></div>)}
                      {asset.asset_type === 'CHIP' && asset.chip && (<div><p className="font-semibold text-gray-200">Nº: {asset.chip.numero}</p>{asset.chip.iccid && <p className="text-xs text-gray-500">ICCID: {asset.chip.iccid}</p>}</div>)}
                      {asset.asset_type === 'Starlink' && asset.starlink && (<div><p className="font-semibold text-gray-200">{asset.starlink.modelo}</p>{asset.starlink.projeto && <p className="text-xs text-blue-400 mt-1">Proj: {asset.starlink.projeto}</p>}</div>)}
                      
                      {groupName && <p className="text-[10px] bg-gray-800 text-brandGreen px-2 py-0.5 rounded inline-block mt-1 mr-2 border border-brandGreen/20">{groupName}</p>}
                      {asset.chip?.vencimento_plano && <p className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded inline-block mt-1 border border-red-500/20">Vence: {asset.chip.vencimento_plano}</p>}
                      {ownerName && <p className="text-xs text-blue-300 font-semibold mt-1 flex items-center gap-1"><Users className="w-3 h-3"/> {ownerName}</p>}
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button onClick={() => setOpenActionMenu(openActionMenu === asset.id ? null : asset.id)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-500 hover:text-white transition-colors"><MoreVertical className="w-5 h-5" /></button>
                      
                      {/* 👇 Menu 3 Pontos com Posicionamento Inteligente (menuPositionClass) 👇 */}
                      {openActionMenu === asset.id && (
                        <div className={`absolute ${menuPositionClass} w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-[100] py-2 text-left animate-fade-in-up`}>
                          <button onClick={() => { setOpenActionMenu(null); setViewAssetDetails({...asset, catalogValue: mappedCatalog?.valor}); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><Info className="w-4 h-4 text-blue-400"/> Detalhes</button>
                          
                          {hasAccess('inventory', 'edit') && (
                            <button onClick={() => { setOpenActionMenu(null); openEditModal(asset); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><Edit2 className="w-4 h-4 text-purple-400"/> Editar Equipamento</button>
                          )}

                          <button onClick={() => { setOpenActionMenu(null); setActiveAsset(asset); setIsHistoryModalOpen(true); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><Clock className="w-4 h-4 text-pink-400"/> Histórico</button>
                          
                          {hasAccess('inventory', 'edit') && !['Descartado', 'Inutilizado', 'Extraviado/Roubado'].includes(asset.status) && (
                            <>
                              <div className="border-t border-gray-700 my-1"></div>
                              
                              {/* 👇 Botão de Atribuir agora liberado para Starlinks e todos os disponíveis 👇 */}
                              {asset.status === 'Disponível' && <button onClick={() => { setOpenActionMenu(null); setActiveAsset(asset); setIsAssignAssetModalOpen(true); setSelectedItemForAssign(''); setNewEmployeeForAssign({nome:'', email:'', departamento:''}); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><CheckCircle className="w-4 h-4 text-brandGreen"/> Atribuir a Alguém</button>}
                              
                              {asset.status === 'Em uso' && <button onClick={() => handleAction(asset.id, 'unassign')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><LogOut className="w-4 h-4 text-red-400"/> Devolver para Estoque</button>}
                              
                              {asset.asset_type === 'CHIP' && asset.status !== 'Renovação' && <button onClick={() => openStatusModal(asset, 'Renovação')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><RefreshCw className="w-4 h-4 text-blue-400"/> Marcar p/ Renovação</button>}
                              
                              {asset.status !== 'Manutenção' && <button onClick={() => { setOpenActionMenu(null); setActiveAsset(asset); setIsMaintenanceModalOpen(true); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><Wrench className="w-4 h-4 text-yellow-400"/> Enviar p/ Manutenção</button>}
                              
                              {['Disponível', 'Manutenção', 'Renovação'].includes(asset.status) && (
                                <>
                                  <div className="border-t border-gray-700 my-1"></div>
                                  <button onClick={() => openStatusModal(asset, 'Inutilizado')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><ShieldAlert className="w-4 h-4 text-orange-400"/> Marcar Inutilizado</button>
                                  <button onClick={() => openStatusModal(asset, 'Extraviado/Roubado')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><AlertTriangle className="w-4 h-4 text-red-500"/> Informar Extravio/Roubo</button>
                                  <button onClick={() => openStatusModal(asset, 'Descartado')} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><Trash2 className="w-4 h-4 text-gray-500"/> Descartar</button>
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
                <tr><td colSpan="5" className="text-center py-20 text-gray-500 font-medium">Nenhum equipamento encontrado com estes filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL NOVO/EDITAR ATIVO */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {isEditingAsset ? <Edit2 className="w-5 h-5 text-purple-400" /> : null} 
                {isEditingAsset ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h2>
              <button onClick={() => setIsAssetModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X/></button>
            </div>
            
            <form onSubmit={isEditingAsset ? handleUpdateAsset : handleCreateAsset} className="flex flex-col gap-4">
              <select required disabled={isEditingAsset} value={newAsset.asset_type} onChange={(e) => setNewAsset({...newAsset, asset_type: e.target.value})} className={`w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none ${isEditingAsset ? 'opacity-50 cursor-not-allowed' : 'hover:border-brandGreen/50 focus:border-brandGreen cursor-pointer transition-colors'}`}>
                <option value="Notebook">Notebook</option><option value="Celular">Celular</option><option value="Starlink">Starlink</option><option value="CHIP">CHIP</option>
              </select>
              
              {newAsset.asset_type === 'Notebook' && (<><input type="text" required placeholder="Patrimônio (Ex: PSI-001)" value={newAsset.patrimonio} onChange={(e) => setNewAsset({...newAsset, patrimonio: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" /><input type="text" required placeholder="Serial Number" value={newAsset.serial_number} onChange={(e) => setNewAsset({...newAsset, serial_number: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" /></>)}
              {newAsset.asset_type === 'Celular' && (<input type="text" placeholder="IMEI (Opcional)" value={newAsset.imei} onChange={(e) => setNewAsset({...newAsset, imei: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />)}
              {newAsset.asset_type === 'CHIP' && (<><input type="text" required placeholder="Número da Linha" value={newAsset.numero} onChange={(e) => setNewAsset({...newAsset, numero: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" /><input type="text" placeholder="ICCID (Opcional)" value={newAsset.iccid} onChange={(e) => setNewAsset({...newAsset, iccid: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" /><input type="date" placeholder="Vencimento do Plano" value={newAsset.vencimento_plano} onChange={(e) => setNewAsset({...newAsset, vencimento_plano: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-gray-400 outline-none" title="Vencimento do Plano"/></>)}
              
              {/* Box de Edição da Starlink com Projeto acessível */}
              {newAsset.asset_type === 'Starlink' && (
                <>
                  <input type="text" required placeholder="Modelo (Ex: Kit V2, Actuated)" value={newAsset.modelo_starlink || ''} onChange={(e) => setNewAsset({...newAsset, modelo_starlink: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  <input type="text" required placeholder="Localização" value={newAsset.localizacao} onChange={(e) => setNewAsset({...newAsset, localizacao: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  <input type="text" placeholder="Projeto (Ex: Parque Eólico Ventos)" value={newAsset.projeto || ''} onChange={(e) => setNewAsset({...newAsset, projeto: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  
                  <div className="border-t border-gray-800 pt-3 mt-1">
                    <p className="text-xs text-gray-500 mb-2">Credenciais de Acesso (Opcional)</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <input type="email" placeholder="E-mail da Conta" value={newAsset.email} onChange={(e) => setNewAsset({...newAsset, email: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none text-sm" />
                      <input type="text" placeholder="Senha da Conta" value={newAsset.senha} onChange={(e) => setNewAsset({...newAsset, senha: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none text-sm" />
                    </div>
                    <input type="text" placeholder="Senha da Rede Wi-Fi" value={newAsset.senha_roteador} onChange={(e) => setNewAsset({...newAsset, senha_roteador: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  </div>
                </>
              )}
              
              {['Celular', 'Starlink', 'CHIP'].includes(newAsset.asset_type) && (
                <div className="border-t border-gray-800 pt-4 mt-2">
                  <p className="text-xs text-gray-500 mb-2">Agrupamento (Obras/Setores)</p>
                  <input type="text" placeholder="Grupo (Ex: Obra Jundiaí)" value={newAsset.grupo} onChange={(e) => setNewAsset({...newAsset, grupo: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white mb-3 outline-none" />
                  <input type="text" placeholder="Responsável Local (Nome)" value={newAsset.responsavel} onChange={(e) => setNewAsset({...newAsset, responsavel: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                </div>
              )}

              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-4 shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all hover:-translate-y-1">
                {isEditingAsset ? 'Salvar Alterações' : 'Salvar Ativo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ATRIBUIR ATIVO COM OPÇÃO DE NOVO COLABORADOR */}
      {isAssignAssetModalOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Atribuir Equipamento</h2>
              <button onClick={() => setIsAssignAssetModalOpen(false)} className="text-gray-400 hover:text-white"><X/></button>
            </div>
            <form onSubmit={submitAssignment} className="flex flex-col gap-4">
              <select required value={selectedItemForAssign} onChange={(e) => setSelectedItemForAssign(e.target.value)} className="w-full bg-black/50 border border-gray-700 hover:border-brandGreen/50 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none cursor-pointer">
                <option value="" disabled>Escolha o Colaborador...</option>
                {employees?.filter(e => e.status !== 'Desligado').map(emp => (<option key={emp.id} value={emp.id}>{emp.nome}</option>))}
                <option value="NEW" className="font-bold text-brandGreen">➕ Cadastrar Novo Colaborador</option>
              </select>

              {selectedItemForAssign === 'NEW' && (
                <div className="border border-brandGreen/30 bg-brandGreen/5 p-4 rounded-xl flex flex-col gap-3 animate-fade-in mt-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <p className="text-xs font-bold text-brandGreen uppercase flex items-center gap-1"><UserPlus className="w-4 h-4"/> Dados do Novo Colaborador</p>
                    <input type="text" placeholder="Nome Completo" required value={newEmployeeForAssign.nome} onChange={(e) => setNewEmployeeForAssign({...newEmployeeForAssign, nome: e.target.value})} className="w-full bg-black/50 border border-brandGreen/30 focus:border-brandGreen rounded-lg p-2.5 text-white outline-none text-sm" />
                    <input type="email" placeholder="E-mail Corporativo" required value={newEmployeeForAssign.email} onChange={(e) => setNewEmployeeForAssign({...newEmployeeForAssign, email: e.target.value})} className="w-full bg-black/50 border border-brandGreen/30 focus:border-brandGreen rounded-lg p-2.5 text-white outline-none text-sm" />
                    <input type="text" placeholder="Departamento" required value={newEmployeeForAssign.departamento} onChange={(e) => setNewEmployeeForAssign({...newEmployeeForAssign, departamento: e.target.value})} className="w-full bg-black/50 border border-brandGreen/30 focus:border-brandGreen rounded-lg p-2.5 text-white outline-none text-sm" />
                </div>
              )}

              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-2 shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all hover:-translate-y-1">Confirmar Atribuição</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO ATIVO */}
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
              
              {viewAssetDetails.asset_type === 'CHIP' && viewAssetDetails.chip?.iccid && (
                  <p className="text-gray-300 mb-1">ICCID: <span className="font-bold text-white">{viewAssetDetails.chip.iccid}</span></p>
              )}

              {viewAssetDetails.asset_type === 'Starlink' && viewAssetDetails.starlink && (
                  <div className="mt-4 bg-gray-800/40 p-4 rounded-xl border border-gray-700 space-y-2">
                      <p className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Wifi className="w-3 h-3 text-blue-400"/> Info. Rede & Credenciais</p>
                      <p className="text-gray-300 text-sm">Modelo: <span className="font-bold text-white">{viewAssetDetails.starlink.modelo || '-'}</span></p>
                      <p className="text-gray-300 text-sm">Projeto: <span className="font-bold text-blue-400">{viewAssetDetails.starlink.projeto || '-'}</span></p>
                      <p className="text-gray-300 text-sm">Localização: <span className="font-bold text-white">{viewAssetDetails.starlink.localizacao || '-'}</span></p>
                      <div className="border-t border-gray-700/50 my-2 pt-2"></div>
                      <p className="text-gray-400 text-xs">E-mail: <span className="font-semibold text-white">{viewAssetDetails.starlink.email || 'Não informado'}</span></p>
                      <p className="text-gray-400 text-xs">Senha Conta: <span className="font-semibold text-white">{viewAssetDetails.starlink.senha || 'Não informada'}</span></p>
                      <p className="text-gray-400 text-xs">Senha Wi-Fi: <span className="font-semibold text-brandGreen">{viewAssetDetails.starlink.senha_roteador || 'Não informada'}</span></p>
                  </div>
              )}

              {viewAssetDetails.chip?.vencimento_plano && <p className="text-gray-300 mb-1 mt-2">Vencimento do Plano: <span className="font-bold text-red-400">{viewAssetDetails.chip.vencimento_plano}</span></p>}
              
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

      {isMaintenanceModalOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Enviar para Manutenção</h2><button onClick={() => setIsMaintenanceModalOpen(false)} className="text-gray-400 hover:text-white"><X/></button></div>
            <form onSubmit={submitMaintenance} className="flex flex-col gap-4">
              <input type="text" required placeholder="Nº do Chamado (Ex: GLPI-1234)" value={maintenanceForm.chamado} onChange={(e) => setMaintenanceForm({...maintenanceForm, chamado: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              <textarea required placeholder="Motivo da manutenção..." value={maintenanceForm.observacao} onChange={(e) => setMaintenanceForm({...maintenanceForm, observacao: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white h-24 focus:border-brandGreen outline-none custom-scrollbar" />
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-4 rounded-full font-bold shadow-lg transition-all">Registrar Manutenção</button>
            </form>
          </div>
        </div>
      )}

      {statusModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-red-900/50 rounded-3xl p-6 w-full max-w-md shadow-[0_0_30px_rgba(239,68,68,0.2)]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><ShieldAlert className="text-red-500 w-6 h-6"/> Auditoria de Baixa / Status</h2>
              <button onClick={() => setStatusModalData(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={submitStatusChange} className="flex flex-col gap-4">
              <textarea required value={statusModalData.observacao} onChange={(e) => setStatusModalData({...statusModalData, observacao: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white h-24 focus:border-red-500 outline-none transition-colors" placeholder="Descreva o motivo da alteração de status..." />
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setStatusModalData(null)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-500 transition-colors"><AlertTriangle className="w-4 h-4"/> Confirmar ({statusModalData.status})</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}