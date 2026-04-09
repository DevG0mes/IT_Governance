import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wrench, Monitor, MoreVertical, Edit2, CheckCircle, X, Filter } from 'lucide-react';
// 🚨 NOVO: Importando a sua API centralizada e blindada
import api from '../services/api';

export default function MaintenanceModule({ assets, hasAccess, fetchData, requestConfirm, registerLog }) {
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [typeFilter, setTypeFilter] = useState('Todos');
  
  // Estados dos Modais
  const [isEditMaintenanceModalOpen, setIsEditMaintenanceModalOpen] = useState(false);
  const [editMaintenanceForm, setEditMaintenanceForm] = useState({ assetId: null, chamado: '', observacao: '' });

  const kanbanColumns = useMemo(() => {
    if (typeFilter === 'CHIP') {
      return ['DISPONIVEL', 'EM USO', 'BLOQUEADO', 'RENOVAR', 'CANCELAR', 'CANCELADO'];
    }
    return ['Manutenção', 'Renovação', 'Disponível', 'Em uso', 'Inutilizado', 'Descartado', 'Extraviado/Roubado'];
  }, [typeFilter]);

  const maintenanceAssets = useMemo(() => {
    const list = Array.isArray(assets) ? assets : [];
    const filtered = list.filter((a) => kanbanColumns.includes(a?.status));
    if (typeFilter === 'Todos') return filtered;
    return filtered.filter((a) => a?.asset_type === typeFilter);
  }, [assets, kanbanColumns, typeFilter]);

  const setChipStatus = async (asset, nextStatus) => {
    const obs = window.prompt(`Justificativa para status ${nextStatus} (obrigatório):`, '');
    if (!obs || !obs.trim()) return;
    try {
      await api.put(`/api/assets/${asset.id}/discard`, { status: nextStatus, observacao: obs.trim() });
      registerLog('UPDATE', 'Telecom', `CHIP ${asset.id} -> ${nextStatus}`);
      setOpenActionMenu(null);
      fetchData();
    } catch (err) {
      alert(getAxiosError(err, 'Erro ao alterar status do CHIP'));
    }
  };

  const assetsByStatus = useMemo(() => {
    const map = {};
    kanbanColumns.forEach((c) => (map[c] = []));
    maintenanceAssets.forEach((a) => {
      const s = a?.status;
      if (map[s]) map[s].push(a);
    });
    return map;
  }, [maintenanceAssets, kanbanColumns]);

  // 🚨 NOVO: Tratamento de erro simplificado para o Axios
  const getAxiosError = (err, defaultMsg) => err.response?.data?.error || err.message || defaultMsg;

  const resolveMaintenance = (assetId) => { 
    requestConfirm('Finalizar Manutenção', 'Deseja devolver este equipamento para o estoque?', async () => { 
      try {
        // 🚨 NOVO: api.put limpo
        await api.put(`/api/assets/${assetId}/resolve-maintenance`);
        
        registerLog('UPDATE', 'Manutenção', `Retornou ativo ID ${assetId} p/ estoque`); 
        setOpenActionMenu(null); 
        fetchData(); 
      } catch(err) { alert(getAxiosError(err, 'Erro ao finalizar manutenção')); }
    }, false, 'Devolver ao Estoque'); 
  };

  const openEditMaintenance = (asset) => { 
    const activeLog = asset.maintenance_logs?.find(log => !log.resolved_at); 
    setEditMaintenanceForm({ assetId: asset.id, chamado: activeLog?.chamado || '', observacao: activeLog?.observacao || '' }); 
    setOpenActionMenu(null); 
    setIsEditMaintenanceModalOpen(true); 
  };

  const submitEditMaintenance = async (e) => { 
    e.preventDefault(); 
    try {
      // 🚨 NOVO: api.put limpo
      await api.put(`/api/assets/${editMaintenanceForm.assetId}/update-maintenance`, { 
          chamado: editMaintenanceForm.chamado, 
          observacao: editMaintenanceForm.observacao 
      });
      
      registerLog('UPDATE', 'Manutenção', `Atualizou log do ativo ID ${editMaintenanceForm.assetId}`); 
      setIsEditMaintenanceModalOpen(false); 
      fetchData(); 
    } catch (err) { alert(getAxiosError(err, 'Erro ao atualizar histórico de manutenção')); }
  };

  useEffect(() => {
    if (!openActionMenu) return;

    const onMouseDown = (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-maint-actions-root="true"]')) return;
      setOpenActionMenu(null);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpenActionMenu(null);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openActionMenu]);

  return (
    <div className="animate-fade-in space-y-4">
      <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-3xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="text-yellow-400" /> Manutenção (Kanban)
          </h2>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-black/60 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-brandGreen transition-colors"
            >
              <option value="Todos">Todos os tipos</option>
              <option value="Notebook">Notebook</option>
              <option value="Celular">Celular</option>
              <option value="CHIP">CHIP</option>
              <option value="Starlink">Starlink</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Cada card usa o status operacional. Chamados ficam em <span className="text-gray-400">maintenance_logs</span>.
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-[980px]">
          {kanbanColumns.map((col) => (
            <div key={col} className="bg-gray-900/60 border border-gray-800 rounded-3xl w-[320px] shrink-0">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{col}</span>
                <span className="text-xs text-gray-500">({assetsByStatus[col]?.length || 0})</span>
              </div>
              <div className="text-xs text-gray-500">{typeFilter !== 'Todos' ? typeFilter : 'Todos'}</div>
            </div>
            <div className="p-4 space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar">
              {(assetsByStatus[col] || []).map((asset) => {
                const nb = asset.Notebook || asset.notebook;
                const cel = asset.Celular || asset.celular;
                const ch = asset.Chip || asset.chip;
                const st = asset.Starlink || asset.starlink;
                const ident = nb?.patrimonio || cel?.imei || ch?.numero || st?.grupo || 'S/N';
                const activeLog = asset.maintenance_logs?.find((log) => !log.resolved_at);

                return (
                  <div
                    key={asset.id}
                    className="bg-black/50 border border-gray-800 rounded-2xl p-4 hover:border-brandGreen/25 transition-colors relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gray-800 rounded-lg shrink-0">
                            <Monitor className="w-4 h-4 text-brandGreen" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-bold truncate">
                              {asset.asset_type} <span className="text-gray-500 font-medium">#{asset.id}</span>
                            </p>
                            <p className="text-xs text-gray-500 truncate">{ident}</p>
                          </div>
                        </div>
                        {col === 'Manutenção' && typeFilter !== 'CHIP' && (
                          <div className="mt-3 text-xs">
                            <p className="text-gray-400">
                              Chamado: <span className="text-yellow-300 font-mono">{activeLog?.chamado || '—'}</span>
                            </p>
                            {activeLog?.observacao ? (
                              <p className="text-gray-500 mt-1 line-clamp-2">{activeLog.observacao}</p>
                            ) : null}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() =>
                          setOpenActionMenu(openActionMenu === `maint-${asset.id}` ? null : `maint-${asset.id}`)
                        }
                        data-maint-actions-root="true"
                        className="p-2 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg text-gray-300 hover:text-white shrink-0"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </div>

                    {openActionMenu === `maint-${asset.id}` && (
                      <div data-maint-actions-root="true" className="absolute right-4 top-14 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-[120] overflow-hidden py-2 text-left">
                        {typeFilter === 'CHIP' ? (
                          <>
                            {['DISPONIVEL', 'EM USO', 'BLOQUEADO', 'RENOVAR', 'CANCELAR', 'CANCELADO'].map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => setChipStatus(asset, st)}
                                className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4 text-brandGreen" /> {st}
                              </button>
                            ))}
                          </>
                        ) : asset.status === 'Manutenção' && hasAccess('maintenance', 'edit') ? (
                          <>
                            <button
                              onClick={() => openEditMaintenance(asset)}
                              className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" /> Atualizar chamado
                            </button>
                            <button
                              onClick={() => resolveMaintenance(asset.id)}
                              className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4 text-brandGreen" /> Finalizar manutenção
                            </button>
                          </>
                        ) : (
                          <p className="px-4 py-2 text-sm text-gray-500 italic">Sem ações para este status.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {(assetsByStatus[col] || []).length === 0 && (
                <div className="text-center text-xs text-gray-600 py-10 italic">Sem itens.</div>
              )}
            </div>
          </div>
          ))}
        </div>
      </div>

      {isEditMaintenanceModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200] overflow-y-auto"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setIsEditMaintenanceModalOpen(false);
            }}
          >
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl my-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Atualizar Tratativa</h2>
                <button
                  onClick={() => setIsEditMaintenanceModalOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={submitEditMaintenance} className="flex flex-col gap-4">
                <input
                  type="text"
                  required
                  value={editMaintenanceForm.chamado}
                  onChange={(e) => setEditMaintenanceForm({ ...editMaintenanceForm, chamado: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors"
                />
                <textarea
                  required
                  value={editMaintenanceForm.observacao}
                  onChange={(e) => setEditMaintenanceForm({ ...editMaintenanceForm, observacao: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white h-24 focus:border-brandGreen outline-none transition-colors custom-scrollbar"
                />
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-full font-bold shadow-lg hover:-translate-y-1 transition-all duration-300"
                >
                  Salvar Histórico
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}