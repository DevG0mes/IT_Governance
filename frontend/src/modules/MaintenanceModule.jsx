import React, { useState } from 'react';
import { Wrench, Monitor, MoreVertical, Edit2, CheckCircle, X } from 'lucide-react';
import { getAuthHeaders } from '../utils/helpers';

export default function MaintenanceModule({ assets, hasAccess, fetchData, requestConfirm, registerLog }) {
  const [openActionMenu, setOpenActionMenu] = useState(null);
  
  // Estados dos Modais
  const [isEditMaintenanceModalOpen, setIsEditMaintenanceModalOpen] = useState(false);
  const [editMaintenanceForm, setEditMaintenanceForm] = useState({ assetId: null, chamado: '', observacao: '' });

  // Filtra apenas os que estão em manutenção ou inativos
  const maintenanceAssets = assets.filter(a => ['Manutenção', 'Descartado', 'Bloqueado', 'Inutilizado', 'Extraviado/Roubado'].includes(a.status));
// Substitua temporariamente a linha por esta (com a URL real do seu backend):
const API_BASE_URL = 'https://paleturquoise-mallard-173694.hostingersite.com';  
const resolveMaintenance = (assetId) => { 
    requestConfirm('Finalizar Manutenção', 'Deseja devolver este equipamento para o estoque?', async () => { 
      try {
        const res = await fetch(`${API_BASE_URL}/api/assets/${assetId}/resolve-maintenance`, { method: 'PUT', headers: getAuthHeaders() });
        if(!res.ok) throw new Error("Erro");
        registerLog('UPDATE', 'Manutenção', `Retornou ativo ID ${assetId} p/ estoque`); 
        setOpenActionMenu(null); 
        fetchData(); 
      } catch(err) { alert(err.message); }
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
      const res = await fetch(`${API_BASE_URL}/api/assets/${editMaintenanceForm.assetId}/update-maintenance`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ chamado: editMaintenanceForm.chamado, observacao: editMaintenanceForm.observacao }) });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Manutenção', `Atualizou log do ativo ID ${editMaintenanceForm.assetId}`); 
      setIsEditMaintenanceModalOpen(false); 
      fetchData(); 
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-3xl shadow-xl min-h-[400px] overflow-hidden animate-fade-in">
      <div className="p-6 border-b border-gray-800 flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Wrench className="text-yellow-400"/> Equipamentos em Manutenção & Inativos</h2>
      </div>
      <table className="w-full text-left text-sm text-gray-300">
        <thead className="bg-black/60 text-gray-400 border-b border-gray-800 uppercase text-xs font-semibold">
          <tr><th className="px-6 py-4">Equipamento / ID</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Nº Chamado</th><th className="px-6 py-4 text-center">Ações</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-800/50">
          {maintenanceAssets.map(asset => { 
            const activeLog = asset.maintenance_logs?.find(log => !log.resolved_at); 
            return (
              <tr key={asset.id} className="hover:bg-gray-800/80 transition-colors duration-200">
                <td className="px-6 py-4 font-bold text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-lg"><Monitor className="w-4 h-4 text-brandGreen" /></div>
                    <div><p>{asset.asset_type}</p><p className="text-xs text-gray-500">{asset.notebook?.patrimonio || asset.celular?.imei || asset.chip?.numero || asset.starlink?.grupo || 'S/N'}</p></div>
                  </div>
                </td>
                <td className="px-6 py-4"><span className={`px-3 py-1 rounded-full text-[11px] font-bold ${asset.status === 'Manutenção' ? 'bg-yellow-900/30 text-yellow-400' : 'bg-red-900/30 text-red-500'}`}>{asset.status}</span></td>
                <td className="px-6 py-4 text-yellow-400 font-mono">{activeLog?.chamado || '-'}</td>
                <td className="px-6 py-4 relative text-center">
                  <button onClick={() => setOpenActionMenu(openActionMenu === `maint-${asset.id}` ? null : `maint-${asset.id}`)} className="p-2 bg-gray-800 hover:bg-gray-700 transition-colors rounded-lg text-gray-300 hover:text-white"><MoreVertical className="w-5 h-5" /></button>
                  {openActionMenu === `maint-${asset.id}` && (
                    <div className="absolute right-8 top-10 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden py-2 text-left">
                      {asset.status === 'Manutenção' && hasAccess('maintenance', 'edit') ? (
                        <>
                          <button onClick={() => openEditMaintenance(asset)} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><Edit2 className="w-4 h-4 text-blue-400"/> Atualizar</button>
                          <button onClick={() => resolveMaintenance(asset.id)} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><CheckCircle className="w-4 h-4 text-brandGreen"/> Finalizar</button>
                        </>
                      ) : (<p className="px-4 py-2 text-sm text-gray-500 italic">Item inativo permanentemente.</p>)}
                    </div>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {isEditMaintenanceModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Atualizar Tratativa</h2>
              <button onClick={() => setIsEditMaintenanceModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={submitEditMaintenance} className="flex flex-col gap-4">
              <input type="text" required value={editMaintenanceForm.chamado} onChange={(e) => setEditMaintenanceForm({...editMaintenanceForm, chamado: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
              <textarea required value={editMaintenanceForm.observacao} onChange={(e) => setEditMaintenanceForm({...editMaintenanceForm, observacao: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white h-24 focus:border-brandGreen outline-none transition-colors custom-scrollbar" />
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-full font-bold shadow-lg hover:-translate-y-1 transition-all duration-300">Salvar Histórico</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}