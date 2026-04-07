import React, { useState, useMemo } from 'react';
import { Database, Laptop, Smartphone, Wifi, Cpu, Search, X, ArrowDownAZ, ArrowUpZA, Trash2, MoreVertical, Info, Clock, CheckCircle, LogOut, ShieldAlert, AlertTriangle, Users, Wrench, RefreshCw, Loader2, Edit2, UserPlus } from 'lucide-react';
import { formatCurrency } from '../utils/helpers';
import api from '../services/api';

function formatDateInput(v) {
  if (!v) return '';
  return String(v).slice(0, 10);
}

function formatDateDisplay(v) {
  const s = formatDateInput(v);
  if (!s) return '';
  const d = new Date(`${s}T12:00:00`);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('pt-BR');
}

export default function InventoryModule({ assets, employees, catalogItems, hasAccess, fetchData, requestConfirm, registerLog, isLoading }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [inventorySearchTerm, setInventorySearchTerm] = useState('');
  const [inventorySortOrder, setInventorySortOrder] = useState('asc');
  const [assetStatusFilter, setAssetStatusFilter] = useState('Todos');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const getInitialAsset = (type) => ({
    asset_type: type === 'Todos' ? 'Notebook' : type,
    status: 'Disponível',
    serial_number: '',
    patrimonio: '',
    modelo_notebook: '',
    garantia: '',
    status_garantia: 'No prazo',
    grupo: '',
    localizacao: '',
    projeto: '',
    modelo_starlink: '',
    email: '',
    senha: '',
    senha_roteador: '',
    responsavel: '',
    imei: '',
    numero: '',
    iccid: '',
    modelo_celular: '',
    plano: '',
    vencimento_plano: '',
    data_aquisicao: '',
  });

  const [newAsset, setNewAsset] = useState(getInitialAsset('Todos'));

  const catalogNomePorCategoria = useMemo(() => {
    const map = { Notebook: [], Celular: [], CHIP: [], Starlink: [] };
    (catalogItems || []).forEach((c) => {
      const cat = (c.category || '').trim();
      const nome = (c.nome || '').trim();
      if (nome && Object.prototype.hasOwnProperty.call(map, cat)) map[cat].push(nome);
    });
    Object.keys(map).forEach((k) => {
      map[k] = [...new Set(map[k])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    });
    return map;
  }, [catalogItems]);

  const notebookModelOptions = useMemo(() => {
    const base = catalogNomePorCategoria.Notebook;
    const cur = (newAsset.modelo_notebook || '').trim();
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [catalogNomePorCategoria.Notebook, newAsset.modelo_notebook]);

  const celularModelOptions = useMemo(() => {
    const base = catalogNomePorCategoria.Celular;
    const cur = (newAsset.modelo_celular || '').trim();
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [catalogNomePorCategoria.Celular, newAsset.modelo_celular]);

  const chipPlanoOptions = useMemo(() => {
    const base = catalogNomePorCategoria.CHIP;
    const cur = (newAsset.plano || '').trim();
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [catalogNomePorCategoria.CHIP, newAsset.plano]);

  const starlinkModelOptions = useMemo(() => {
    const base = catalogNomePorCategoria.Starlink;
    const cur = (newAsset.modelo_starlink || '').trim();
    if (cur && !base.includes(cur)) return [cur, ...base];
    return base;
  }, [catalogNomePorCategoria.Starlink, newAsset.modelo_starlink]);

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

  const getAxiosError = (err, defaultMsg) => err.response?.data?.error || err.message || defaultMsg;

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
  
  // 🛡️ Lógica Blindada de Busca
  if (inventorySearchTerm) { 
    const term = inventorySearchTerm.toLowerCase(); 
    filteredAssets = filteredAssets.filter(a => {
      const nb = a?.Notebook || a?.notebook;
      const cel = a?.Celular || a?.celular;
      const ch = a?.Chip || a?.chip;
      const st = a?.Starlink || a?.starlink;
      
      return (
        nb?.patrimonio?.toLowerCase().includes(term) || 
        nb?.serial_number?.toLowerCase().includes(term) || 
        nb?.modelo?.toLowerCase().includes(term) ||
        cel?.imei?.toLowerCase().includes(term) ||
        cel?.modelo?.toLowerCase().includes(term) || 
        ch?.numero?.toLowerCase().includes(term) || 
        ch?.iccid?.toLowerCase().includes(term) || 
        ch?.plano?.toLowerCase().includes(term) ||
        st?.grupo?.toLowerCase().includes(term) ||
        st?.projeto?.toLowerCase().includes(term) ||
        st?.modelo?.toLowerCase().includes(term) ||
        cel?.grupo?.toLowerCase().includes(term) ||
        ch?.grupo?.toLowerCase().includes(term)
      );
    }); 
  }
  
  filteredAssets.sort((a, b) => { 
    const getIdent = (asset) => {
      const nb = asset?.Notebook || asset?.notebook;
      const cel = asset?.Celular || asset?.celular;
      const ch = asset?.Chip || asset?.chip;
      const st = asset?.Starlink || asset?.starlink;
      return nb?.patrimonio || cel?.imei || ch?.numero || st?.grupo || ''; 
    };
    const valA = getIdent(a).toLowerCase(); const valB = getIdent(b).toLowerCase(); 
    return inventorySortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA); 
  });

  const totalItems = filteredAssets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const visibleAssets = filteredAssets.slice(startIdx, endIdx);

  // Reset de paginação quando filtros mudam
  React.useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [selectedCategory, assetStatusFilter, inventorySearchTerm, inventorySortOrder]);

  // Ao trocar página, rolar o container principal para o topo (evita sensação de "lista infinita")
  React.useEffect(() => {
    const main = document.querySelector('main');
    if (main && typeof main.scrollTo === 'function') main.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const toggleAll = () =>
    selectedIds.length === visibleAssets.length && visibleAssets.length > 0
      ? setSelectedIds([])
      : setSelectedIds(visibleAssets.map(item => item.id));

  // 🛡️ Lógica Blindada no Edit Modal
  const openEditModal = (asset) => {
      const nb = asset?.Notebook || asset?.notebook;
      const cel = asset?.Celular || asset?.celular;
      const ch = asset?.Chip || asset?.chip;
      const st = asset?.Starlink || asset?.starlink;

      const flatAsset = {
          id: asset.id,
          asset_type: asset.asset_type,
          status: asset.status,
          patrimonio: nb?.patrimonio || '',
          serial_number: nb?.serial_number || '',
          modelo_notebook: nb?.modelo || '',
          garantia: nb?.garantia || '',
          status_garantia: nb?.status_garantia || 'No prazo',
          imei: cel?.imei || '',
          modelo_celular: cel?.modelo || '',
          numero: ch?.numero || '',
          iccid: ch?.iccid || '',
          plano: ch?.plano || '',
          vencimento_plano: ch?.vencimento_plano || '',
          localizacao: st?.localizacao || '',
          projeto: st?.projeto || '',
          modelo_starlink: st?.modelo || '',
          email: st?.email || '',
          senha: st?.senha || '',
          senha_roteador: st?.senha_roteador || '',
          grupo: cel?.grupo || ch?.grupo || st?.grupo || '',
          responsavel: cel?.responsavel || ch?.responsavel || st?.responsavel || '',
          data_aquisicao: formatDateInput(nb?.data_aquisicao || cel?.data_aquisicao || ch?.data_aquisicao || st?.data_aquisicao),
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
      await api.post('/api/assets', { ...newAsset, status: statusInicial });
      registerLog('CREATE', 'Inventário', `Cadastrou o ativo ${newAsset.asset_type}`); 
      setIsAssetModalOpen(false); 
      fetchData(); 
    } catch (err) { alert(getAxiosError(err, 'Erro ao criar equipamento')); }
  };

  const handleUpdateAsset = async (e) => {
    e.preventDefault();
    try {
        await api.put(`/api/assets/${activeAsset.id}`, newAsset);
        registerLog('UPDATE', 'Inventário', `Atualizou os dados do ativo ID ${activeAsset.id}`);
        setIsAssetModalOpen(false);
        setIsEditingAsset(false);
        fetchData();
    } catch (err) { alert(getAxiosError(err, 'Erro ao atualizar equipamento')); }
  };

  const handleAction = (assetId, action) => { 
    setOpenActionMenu(null); 
    requestConfirm('Confirmar Ação', `Deseja aplicar esta ação no equipamento?`, async () => { 
      try {
        await api.put(`/api/assets/${assetId}/${action}`);
        registerLog('UPDATE', 'Inventário', `Ação ${action} no ativo ID ${assetId}`); 
        fetchData(); 
      } catch (err) { alert(getAxiosError(err, 'Erro ao aplicar ação')); }
    }, action === 'unassign' || action === 'discard', action === 'unassign' ? 'Devolver' : 'Confirmar'); 
  };

  const submitAssignment = async (e) => { 
    e.preventDefault(); 
    try {
      let targetEmpId = selectedItemForAssign;
      if (targetEmpId === 'NEW') {
          const createRes = await api.post('/api/employees', newEmployeeForAssign);
          targetEmpId = createRes.data.data.id || createRes.data.id; 
          registerLog('CREATE', 'Colaboradores', `Cadastrou funcionário ${newEmployeeForAssign.nome} via Atribuição`);
      }
      await api.put(`/api/employees/${targetEmpId}/assign`, { asset_id: activeAsset.id });
      registerLog('UPDATE', 'Inventário', `Atribuiu ativo ID ${activeAsset.id} ao colab ID ${targetEmpId}`); 
      setIsAssignAssetModalOpen(false); 
      setSelectedItemForAssign(''); 
      setNewEmployeeForAssign({nome: '', email: '', departamento: ''});
      fetchData(); 
    } catch(err) { alert(getAxiosError(err, 'Erro ao atribuir equipamento')); }
  };

  const submitMaintenance = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/api/assets/${activeAsset.id}/maintenance`, maintenanceForm);
      registerLog('UPDATE', 'Manutenção', `Enviou ativo ID ${activeAsset.id} p/ conserto`); 
      setIsMaintenanceModalOpen(false); 
      setMaintenanceForm({chamado: '', observacao: ''}); 
      fetchData();
    } catch (err) { alert(getAxiosError(err, 'Erro ao enviar para manutenção')); }
  };

  const openStatusModal = (asset, newStatus) => { 
    setOpenActionMenu(null); 
    setStatusModalData({ asset: asset, status: newStatus, observacao: '' }); 
  };

  const submitStatusChange = async (e) => {
    e.preventDefault(); 
    if (statusModalData.observacao.trim() === '') { alert("A justificativa é obrigatória."); return; } 
    try {
      await api.put(`/api/assets/${statusModalData.asset.id}/discard`, { 
          status: statusModalData.status, 
          observacao: statusModalData.observacao 
      });
      registerLog('UPDATE', 'Baixas', `Status do ativo ${statusModalData.asset.id} alterado para ${statusModalData.status}`); 
      setStatusModalData(null); 
      fetchData();
    } catch (err) { alert(getAxiosError(err, 'Erro ao alterar status')); }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    requestConfirm('Exclusão em Massa', `ATENÇÃO: Excluir DEFINITIVAMENTE ${selectedIds.length} itens?`, async () => {
        try {
            await Promise.all(selectedIds.map(async (id) => { 
              await api.delete(`/api/assets/${id}`); 
            }));
            registerLog('DELETE BULK', 'INVENTÁRIO', `Excluiu ${selectedIds.length} ativos.`); 
            setSelectedIds([]); 
            fetchData(); 
            alert('✅ Exclusão concluída!');
        } catch (err) { alert(`❌ Erro: ${getAxiosError(err, 'Falha na exclusão')}`); }
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="text-xs text-gray-500">
            Mostrando <span className="text-gray-200 font-semibold">{totalItems === 0 ? 0 : startIdx + 1}</span>–
            <span className="text-gray-200 font-semibold">{Math.min(endIdx, totalItems)}</span> de{' '}
            <span className="text-gray-200 font-semibold">{totalItems}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-500">Limite: <span className="text-gray-200 font-semibold">50</span>/página</div>
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage(1)}
                className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              >
                «
              </button>
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              >
                Anterior
              </button>
              <div className="px-3 py-2 text-xs text-gray-400">
                Página <span className="text-gray-200 font-semibold">{currentPage}</span>/{totalPages}
              </div>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              >
                Próxima
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage(totalPages)}
                className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
              >
                »
              </button>
            </div>
          </div>
        </div>
        
        {selectedIds.length > 0 && hasAccess('inventory', 'edit') && (
          <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-2xl mb-4 flex justify-between items-center relative z-10 animate-fade-in">
            <span className="text-white font-bold">{selectedIds.length} ativo(s) selecionado(s)</span>
            <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"><Trash2 className="w-5 h-5" /> Excluir</button>
          </div>
        )}

        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl min-h-[400px] relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm z-20">
              <Loader2 className="w-12 h-12 text-brandGreen animate-spin mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <p className="text-brandGreen font-bold animate-pulse tracking-widest uppercase text-sm">Atualizando Dados...</p>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[860px]">
              <thead className="bg-black/60 border-b border-gray-800 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 w-12 rounded-tl-3xl">{hasAccess('inventory', 'edit') && <input type="checkbox" checked={selectedIds.length === visibleAssets.length && visibleAssets.length > 0} onChange={toggleAll} className="accent-brandGreen cursor-pointer w-4 h-4" />}</th>
                  <th className="px-6 py-4">Equipamento</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Identificador / Grupo</th><th className="px-6 py-4 text-center rounded-tr-3xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {assets && visibleAssets.length > 0 ? visibleAssets.map((asset, idx) => { 
                  if (!asset) return null;

                // 🛡️ Lógica Blindada nas sub-tabelas
                const nb = asset.Notebook || asset.notebook;
                const cel = asset.Celular || asset.celular;
                const ch = asset.Chip || asset.chip;
                const st = asset.Starlink || asset.starlink;
                const assignments = asset.AssetAssignments || asset.assignments || asset.AssetAssignment || [];

                const activeAsg = assignments.find(a => !a.returned_at); 
                const empInfo = activeAsg?.Employee || activeAsg?.employee;
                const ownerName = empInfo?.nome || cel?.responsavel || ch?.responsavel || st?.responsavel; 
                const groupName = cel?.grupo || ch?.grupo || st?.grupo;
                let catModel = nb?.modelo || cel?.modelo || st?.modelo || ch?.plano || '';
                const mappedCatalog = (catalogItems || []).find(c => c.category === asset.asset_type && c.nome?.toLowerCase() === catModel?.toLowerCase());

                const isLastRows = idx >= visibleAssets.length - 2 && visibleAssets.length > 2;
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
                      {asset.asset_type === 'Notebook' && nb && (<div><p className="font-semibold text-gray-200">{nb.patrimonio}</p>{nb.modelo && <p className="text-xs text-gray-400">Modelo: {nb.modelo}</p>}<p className="text-xs text-gray-500">SN: {nb.serial_number}</p>{nb.data_aquisicao && <p className="text-[10px] text-gray-500">Aquisição: {formatDateDisplay(nb.data_aquisicao)}</p>}</div>)}
                      {asset.asset_type === 'Celular' && cel && (<div><p className="font-semibold text-gray-200">IMEI: {cel.imei || '—'}</p>{cel.modelo && <p className="text-xs text-gray-400">Modelo: {cel.modelo}</p>}{cel.data_aquisicao && <p className="text-[10px] text-gray-500">Aquisição: {formatDateDisplay(cel.data_aquisicao)}</p>}</div>)}
                      {asset.asset_type === 'CHIP' && ch && (<div><p className="font-semibold text-gray-200">Nº: {ch.numero}</p>{ch.plano && <p className="text-xs text-gray-400">Plano: {ch.plano}</p>}{ch.iccid && <p className="text-xs text-gray-500">ICCID: {ch.iccid}</p>}{ch.data_aquisicao && <p className="text-[10px] text-gray-500">Aquisição: {formatDateDisplay(ch.data_aquisicao)}</p>}</div>)}
                      {asset.asset_type === 'Starlink' && st && (<div><p className="font-semibold text-gray-200">{st.modelo}</p>{st.projeto && <p className="text-xs text-blue-400 mt-1">Proj: {st.projeto}</p>}{st.data_aquisicao && <p className="text-[10px] text-gray-500">Aquisição: {formatDateDisplay(st.data_aquisicao)}</p>}</div>)}
                      
                      {groupName && <p className="text-[10px] bg-gray-800 text-brandGreen px-2 py-0.5 rounded inline-block mt-1 mr-2 border border-brandGreen/20">{groupName}</p>}
                      {ch?.vencimento_plano && <p className="text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded inline-block mt-1 border border-red-500/20">Vence: {ch.vencimento_plano}</p>}
                      {ownerName && <p className="text-xs text-blue-300 font-semibold mt-1 flex items-center gap-1"><Users className="w-3 h-3"/> {ownerName}</p>}
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button onClick={() => setOpenActionMenu(openActionMenu === asset.id ? null : asset.id)} className="p-2 hover:bg-gray-700 rounded-lg text-gray-500 hover:text-white transition-colors"><MoreVertical className="w-5 h-5" /></button>
                      
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
                  <tr><td colSpan="5" className="text-center py-20 text-gray-500 font-medium">Nenhum equipamento encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação (rodapé) */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-gray-500">
            Página <span className="text-gray-200 font-semibold">{currentPage}</span>/{totalPages} —{' '}
            <span className="text-gray-200 font-semibold">{totalItems}</span> item(ns)
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(1)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              «
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              Próxima
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(totalPages)}
              className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-gray-900/80 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
            >
              »
            </button>
          </div>
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
              <p className="text-[11px] text-gray-500 -mt-2">Modelo ou plano (CHIP) deve existir no Catálogo — cada unidade pode ter data de aquisição diferente.</p>
              
              {newAsset.asset_type === 'Notebook' && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Modelo (catálogo)</label>
                    <select required value={newAsset.modelo_notebook} onChange={(e) => setNewAsset({ ...newAsset, modelo_notebook: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none">
                      <option value="" disabled>Selecione o modelo...</option>
                      {notebookModelOptions.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Data de aquisição</label>
                    <input type="date" value={newAsset.data_aquisicao} onChange={(e) => setNewAsset({ ...newAsset, data_aquisicao: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  </div>
                  <input type="text" required placeholder="Patrimônio (Ex: PSI-001)" value={newAsset.patrimonio} onChange={(e) => setNewAsset({...newAsset, patrimonio: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  <input type="text" required placeholder="Serial Number" value={newAsset.serial_number} onChange={(e) => setNewAsset({...newAsset, serial_number: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Garantia até (texto ou data)</label>
                    <input type="text" placeholder="Ex: 06/06/2029" value={newAsset.garantia} onChange={(e) => setNewAsset({ ...newAsset, garantia: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Situação da garantia</label>
                    <select value={newAsset.status_garantia} onChange={(e) => setNewAsset({ ...newAsset, status_garantia: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none">
                      <option value="No prazo">No prazo</option>
                      <option value="ATIVO">ATIVO</option>
                      <option value="VENCIDO">VENCIDO</option>
                      <option value="Vencido">Vencido</option>
                    </select>
                  </div>
                </>
              )}
              {newAsset.asset_type === 'Celular' && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Modelo (catálogo)</label>
                    <select required value={newAsset.modelo_celular} onChange={(e) => setNewAsset({ ...newAsset, modelo_celular: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none">
                      <option value="" disabled>Selecione o modelo...</option>
                      {celularModelOptions.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Data de aquisição</label>
                    <input type="date" value={newAsset.data_aquisicao} onChange={(e) => setNewAsset({ ...newAsset, data_aquisicao: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  </div>
                  <input type="text" placeholder="IMEI (Opcional)" value={newAsset.imei} onChange={(e) => setNewAsset({...newAsset, imei: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                </>
              )}
              {newAsset.asset_type === 'CHIP' && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Plano (catálogo)</label>
                    <select required value={newAsset.plano} onChange={(e) => setNewAsset({ ...newAsset, plano: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none">
                      <option value="" disabled>Selecione o plano...</option>
                      {chipPlanoOptions.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Data de aquisição</label>
                    <input type="date" value={newAsset.data_aquisicao} onChange={(e) => setNewAsset({ ...newAsset, data_aquisicao: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  </div>
                  <input type="text" required placeholder="Número da Linha" value={newAsset.numero} onChange={(e) => setNewAsset({...newAsset, numero: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  <input type="text" placeholder="ICCID (Opcional)" value={newAsset.iccid} onChange={(e) => setNewAsset({...newAsset, iccid: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Vencimento do plano (fatura)</label>
                    <input type="date" value={newAsset.vencimento_plano} onChange={(e) => setNewAsset({...newAsset, vencimento_plano: e.target.value})} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-gray-400 outline-none" title="Vencimento do Plano" />
                  </div>
                </>
              )}
              
              {newAsset.asset_type === 'Starlink' && (
                <>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Modelo (catálogo)</label>
                    <select required value={newAsset.modelo_starlink || ''} onChange={(e) => setNewAsset({ ...newAsset, modelo_starlink: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none">
                      <option value="" disabled>Selecione o modelo...</option>
                      {starlinkModelOptions.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Data de aquisição</label>
                    <input type="date" value={newAsset.data_aquisicao} onChange={(e) => setNewAsset({ ...newAsset, data_aquisicao: e.target.value })} className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none" />
                  </div>
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

      {/* MODAL ATRIBUIR ATIVO */}
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
      {viewAssetDetails && (() => {
        const nb = viewAssetDetails.Notebook || viewAssetDetails.notebook;
        const cel = viewAssetDetails.Celular || viewAssetDetails.celular;
        const ch = viewAssetDetails.Chip || viewAssetDetails.chip;
        const st = viewAssetDetails.Starlink || viewAssetDetails.starlink;
        const assignments = viewAssetDetails.AssetAssignments || viewAssetDetails.assignments || [];
        const activeAsg = assignments.find((a) => !a.returned_at);
        const empAtivo = activeAsg?.Employee || activeAsg?.employee;

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Detalhes do equipamento</h2>
                <button onClick={() => setViewAssetDetails(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
              <div className="bg-black/50 p-5 rounded-xl border border-gray-800 space-y-3 text-sm">
                <p className="text-gray-300">Tipo: <span className="font-bold text-white">{viewAssetDetails.asset_type}</span></p>
                <p className="text-gray-300">
                  Status operacional:{' '}
                  <span className="font-bold text-gray-100 uppercase text-xs px-2 py-0.5 bg-gray-700 rounded-full">{viewAssetDetails.status}</span>
                </p>

                {viewAssetDetails.asset_type === 'Notebook' && nb && (
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Notebook</p>
                    <p className="text-gray-300">Patrimônio: <span className="font-bold text-white">{nb.patrimonio || '—'}</span></p>
                    <p className="text-gray-300">Serial: <span className="font-bold text-white">{nb.serial_number || '—'}</span></p>
                    <p className="text-gray-300">Modelo (catálogo): <span className="font-bold text-brandGreen">{nb.modelo || '—'}</span></p>
                    {nb.garantia && <p className="text-gray-300">Garantia até: <span className="font-bold text-white">{nb.garantia}</span></p>}
                    {nb.status_garantia && (
                      <p className="text-gray-300">
                        Situação garantia: <span className="font-bold text-white">{nb.status_garantia}</span>
                      </p>
                    )}
                    {nb.data_aquisicao && (
                      <p className="text-gray-300">
                        Data de aquisição: <span className="font-bold text-white">{formatDateDisplay(nb.data_aquisicao)}</span>
                      </p>
                    )}
                  </div>
                )}

                {viewAssetDetails.asset_type === 'Celular' && cel && (
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">Celular</p>
                    <p className="text-gray-300">IMEI: <span className="font-bold text-white">{cel.imei || '—'}</span></p>
                    <p className="text-gray-300">Modelo (catálogo): <span className="font-bold text-brandGreen">{cel.modelo || '—'}</span></p>
                    {cel.grupo && <p className="text-gray-300">Grupo: <span className="font-bold text-white">{cel.grupo}</span></p>}
                    {cel.responsavel && (
                      <p className="text-gray-300">Responsável local: <span className="font-bold text-white">{cel.responsavel}</span></p>
                    )}
                    {cel.data_aquisicao && (
                      <p className="text-gray-300">
                        Data de aquisição: <span className="font-bold text-white">{formatDateDisplay(cel.data_aquisicao)}</span>
                      </p>
                    )}
                  </div>
                )}

                {viewAssetDetails.asset_type === 'CHIP' && ch && (
                  <div className="border-t border-gray-800 pt-3 space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase">CHIP / linha</p>
                    {ch.iccid && <p className="text-gray-300">ICCID: <span className="font-bold text-white break-all">{ch.iccid}</span></p>}
                    <p className="text-gray-300">Número: <span className="font-bold text-white">{ch.numero || '—'}</span></p>
                    <p className="text-gray-300">Plano (catálogo): <span className="font-bold text-brandGreen">{ch.plano || '—'}</span></p>
                    {ch.grupo && <p className="text-gray-300">Grupo: <span className="font-bold text-white">{ch.grupo}</span></p>}
                    {ch.responsavel && (
                      <p className="text-gray-300">Responsável: <span className="font-bold text-white">{ch.responsavel}</span></p>
                    )}
                    {ch.vencimento_plano && (
                      <p className="text-gray-300">
                        Vencimento do plano: <span className="font-bold text-red-300">{formatDateDisplay(ch.vencimento_plano)}</span>
                      </p>
                    )}
                    {ch.data_aquisicao && (
                      <p className="text-gray-300">
                        Data de aquisição: <span className="font-bold text-white">{formatDateDisplay(ch.data_aquisicao)}</span>
                      </p>
                    )}
                  </div>
                )}

                {viewAssetDetails.asset_type === 'Starlink' && st && (
                  <div className="mt-2 bg-gray-800/40 p-4 rounded-xl border border-gray-700 space-y-2">
                    <p className="text-gray-400 text-xs font-bold uppercase mb-2 flex items-center gap-1">
                      <Wifi className="w-3 h-3 text-blue-400" /> Starlink
                    </p>
                    <p className="text-gray-300 text-sm">Modelo: <span className="font-bold text-white">{st.modelo || '-'}</span></p>
                    <p className="text-gray-300 text-sm">Projeto: <span className="font-bold text-blue-400">{st.projeto || '-'}</span></p>
                    <p className="text-gray-300 text-sm">Localização: <span className="font-bold text-white">{st.localizacao || '-'}</span></p>
                    {st.grupo && <p className="text-gray-300 text-sm">Grupo: <span className="font-bold text-white">{st.grupo}</span></p>}
                    {st.responsavel && (
                      <p className="text-gray-300 text-sm">Responsável: <span className="font-bold text-white">{st.responsavel}</span></p>
                    )}
                    {st.data_aquisicao && (
                      <p className="text-gray-300 text-sm">
                        Data de aquisição: <span className="font-bold text-white">{formatDateDisplay(st.data_aquisicao)}</span>
                      </p>
                    )}
                    <div className="border-t border-gray-700/50 my-2 pt-2" />
                    <p className="text-gray-400 text-xs">E-mail conta: <span className="font-semibold text-white">{st.email || '—'}</span></p>
                    <p className="text-gray-400 text-xs">Senha conta: <span className="font-semibold text-white">{st.senha || '—'}</span></p>
                    <p className="text-gray-400 text-xs">Senha Wi-Fi: <span className="font-semibold text-brandGreen">{st.senha_roteador || '—'}</span></p>
                  </div>
                )}

                <div className="border-t border-gray-800 pt-3">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Colaborador vinculado</p>
                  {empAtivo ? (
                    <div>
                      <p className="text-white font-semibold">{empAtivo.nome}</p>
                      <p className="text-gray-400 text-xs">{empAtivo.email}</p>
                    </div>
                  ) : (
                    <p className="text-gray-500 italic text-sm">Nenhum colaborador atribuído no momento.</p>
                  )}
                </div>

                <div className="mt-2 pt-4 border-t border-gray-700">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Valuation (Catálogo)</p>
                  <p className="text-xl font-bold text-brandGreen">
                    {viewAssetDetails.catalogValue ? formatCurrency(viewAssetDetails.catalogValue) : 'Não precificado'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🛡️ Modal Histórico com Variável Blindada */}
      {isHistoryModalOpen && activeAsset && (() => {
        const assignments = activeAsset.AssetAssignments || activeAsset.assignments || activeAsset.AssetAssignment || [];
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Clock className="text-purple-400"/> Histórico de Donos</h2>
                <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-white p-2"><X className="w-6 h-6" /></button>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {assignments.length > 0 ? assignments.sort((a,b) => new Date(b.assigned_at) - new Date(a.assigned_at)).map((assignment, idx) => {
                  const emp = assignment.Employee || assignment.employee;
                  return (
                    <div key={idx} className="bg-black/50 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-gray-700 transition-colors">
                      <div><p className="text-brandGreen font-bold">{emp?.nome || 'Desconhecido'}</p><p className="text-xs text-gray-500">{emp?.email}</p></div>
                      <div className="text-right text-sm">
                        <p className="text-gray-300">Início: {new Date(assignment.assigned_at).toLocaleDateString('pt-BR')}</p>
                        <p className="text-blue-400 font-semibold">Fim: {assignment.returned_at ? new Date(assignment.returned_at).toLocaleDateString('pt-BR') : 'Em uso'}</p>
                      </div>
                    </div>
                  );
                }) : <p className="text-center py-10 text-gray-600 italic">Nenhuma atribuição registrada.</p>}
              </div>
            </div>
          </div>
        );
      })()}

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