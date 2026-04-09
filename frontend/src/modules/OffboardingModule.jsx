import React, { useState } from 'react';
import { Search, X, CheckCircle, AlertTriangle, Laptop, Key, PowerOff, ShieldAlert, ChevronRight, Users, History } from 'lucide-react';
// 🚨 NOVO: Importando a sua API centralizada e blindada
import api from '../services/api';

export default function OffboardingModule({ employees = [], assets = [], licenses = [], hasAccess, fetchData, registerLog, requestConfirm }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAllDesligados, setShowAllDesligados] = useState(false);
  const [offboardingForm, setOffboardingForm] = useState(null);

  // 🚨 NOVO: Tratamento de erro simplificado para o Axios
  const getAxiosError = (err, defaultMsg) => err.response?.data?.error || err.message || defaultMsg;

  const getActiveAssets = (empId) => (assets || []).filter(a => {
    if (!a || a.status !== 'Em uso') return false;
    const assignments = a.Assignments || a.assignments || a.AssetAssignments || [];
    return assignments.some(asg => (asg?.EmployeeId === empId || asg?.employee_id === empId) && !asg?.returned_at);
  });

  const getAssetIdentDisplay = (asset) => {
    const nb = asset?.Notebook || asset?.notebook;
    const cel = asset?.Celular || asset?.celular;
    const ch = asset?.Chip || asset?.chip;
    const st = asset?.Starlink || asset?.starlink;

    if (asset?.asset_type === 'Notebook' && nb) {
      const ident = nb.patrimonio || nb.serial_number || '—';
      const modelo = nb.modelo ? ` • ${nb.modelo}` : '';
      return `${ident}${modelo}`;
    }
    if (asset?.asset_type === 'Celular' && cel) {
      const ident = cel.imei || '—';
      const modelo = cel.modelo ? ` • ${cel.modelo}` : '';
      return `${ident}${modelo}`;
    }
    if (asset?.asset_type === 'CHIP' && ch) {
      const ident = ch.numero || '—';
      const plano = ch.plano ? ` • ${ch.plano}` : '';
      return `${ident}${plano}`;
    }
    if (asset?.asset_type === 'Starlink' && st) {
      return st.projeto || st.modelo || st.grupo || '—';
    }
    return 'Sem identificador';
  };
  
  const getActiveLicenses = (empId) => {
    const empLics = [];
    (licenses || []).forEach(lic => {
      if (lic.assignments) {
        const asg = lic.assignments.find(a => a.employee_id === empId && !a.revoked_at);
        if (asg) empLics.push({ assignment_id: asg.id, license: lic });
      }
    });
    return empLics;
  };

  const offboardingEmployees = (employees || []).filter(emp => {
    const status = (emp.status || '').toLowerCase().trim();
    const matchesSearch = (emp.nome || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    let isOffboarding = false;

    if (showAllDesligados) {
        // Histórico: Mostra todo mundo que tá "Desligado" OU "Em Desligamento"
        isOffboarding = status === 'desligado' || status === 'em desligamento';
    } else {
        // Fila: Mostra apenas quem está "Em Desligamento"
        isOffboarding = status === 'em desligamento';
    }
    
    return isOffboarding && matchesSearch;
  });

  const handleReturnAsset = (assetId) => {
    requestConfirm('Devolver Hardware', 'Confirmar a devolução deste equipamento para o estoque?', async () => {
      try {
        // 🚨 NOVO: api.put limpo
        await api.put(`/api/assets/${assetId}/unassign`);
        
        registerLog('UPDATE', 'Revogação', `Devolveu hardware ID ${assetId} ao estoque`);
        fetchData();
      } catch (err) { alert(getAxiosError(err, 'Erro ao devolver ativo')); }
    }, true, 'Devolver Equipamento');
  };

  const handleRevokeLicense = async (assignmentId) => {
    try {
      // 🚨 NOVO: api.delete limpo
      await api.delete(`/api/licenses/unassign/${assignmentId}`);
      
      registerLog('UPDATE', 'Revogação', `Revogou licença ID ${assignmentId}`);
      fetchData();
    } catch (err) { alert(getAxiosError(err, 'Erro ao revogar licença')); }
  };

  const finalizeOffboarding = (emp) => {
    const remainingAssets = getActiveAssets(emp.id).length;
    const remainingLicenses = getActiveLicenses(emp.id).length;

    if (remainingAssets > 0 || remainingLicenses > 0) {
      alert(`⚠️ Atenção: Você precisa revogar todas as licenças e devolver todos os hardwares antes de finalizar o desligamento de ${emp.nome}.`);
      return;
    }

    requestConfirm('Finalizar Desligamento', `Confirmar o desligamento definitivo de ${emp.nome}? O status mudará para "Desligado" no sistema.`, async () => {
      try {
        // 🚨 NOVO: api.put enviando o JSON automaticamente
        await api.put(`/api/employees/${emp.id}/offboarding`, { status: 'Desligado' });
        
        registerLog('UPDATE', 'Revogação', `Finalizou o desligamento de ${emp.nome}`);
        setSelectedEmployee(null);
        fetchData();
      } catch (err) { alert(getAxiosError(err, 'Erro ao finalizar desligamento no servidor.')); }
    }, true, 'Concluir Desligamento');
  };

  const openEmployee = (emp) => {
    setSelectedEmployee(emp);
    setOffboardingForm({
      termo_url: emp?.termo_url || '',
      offboarding_onfly: Number(emp?.offboarding_onfly || 0) === 1,
      offboarding_mega: Number(emp?.offboarding_mega || 0) === 1,
      offboarding_adm365: Number(emp?.offboarding_adm365 || 0) === 1,
      offboarding_license: Number(emp?.offboarding_license || 0) === 1,
    });
  };

  const saveChecklist = async () => {
    if (!selectedEmployee || !offboardingForm) return;
    try {
      await api.put(`/api/employees/${selectedEmployee.id}`, {
        status: 'Em desligamento',
        termo_url: offboardingForm.termo_url,
        offboarding_onfly: offboardingForm.offboarding_onfly ? 1 : 0,
        offboarding_mega: offboardingForm.offboarding_mega ? 1 : 0,
        offboarding_adm365: offboardingForm.offboarding_adm365 ? 1 : 0,
        offboarding_license: offboardingForm.offboarding_license ? 1 : 0,
      });
      registerLog('UPDATE', 'Revogação', `Atualizou checklist/termo de ${selectedEmployee.nome}`);
      fetchData();
    } catch (err) {
      alert(getAxiosError(err, 'Erro ao salvar checklist'));
    }
  };

  const canFinalize = (emp) => {
    const remainingAssets = getActiveAssets(emp.id).length;
    const remainingLicenses = getActiveLicenses(emp.id).length;
    const okChecklist = offboardingForm
      ? (offboardingForm.offboarding_onfly && offboardingForm.offboarding_mega && offboardingForm.offboarding_adm365 && offboardingForm.offboarding_license && (offboardingForm.termo_url || '').trim())
      : false;
    return remainingAssets === 0 && remainingLicenses === 0 && okChecklist;
  };

  return (
    <div className="animate-fade-in relative min-h-[500px]">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500"/> Central de Revogação
          </h2>
          <p className="text-gray-400 mt-2">Gerencie a devolução de hardwares e revogação de acessos de colaboradores em desligamento.</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
                setShowAllDesligados(!showAllDesligados);
                setSelectedEmployee(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold border transition-all ${showAllDesligados ? 'bg-gray-800 text-white border-gray-600' : 'bg-transparent text-gray-500 border-gray-700 hover:text-gray-300'}`}
          >
            <History className="w-4 h-4"/>
            {showAllDesligados ? 'Esconder Histórico' : 'Ver Histórico Completo'}
          </button>

          <div className="flex items-center gap-3 bg-gray-900/80 border border-gray-700 rounded-full px-4 py-2.5 w-full max-w-xs focus-within:border-red-500 transition-colors">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Buscar colaborador..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-gray-900/80 border border-gray-800 rounded-3xl overflow-hidden shadow-xl flex flex-col h-[600px]">
          <div className="p-4 bg-black/40 border-b border-gray-800">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400"/> {showAllDesligados ? 'Histórico de Desligados' : 'Fila de Desligamento'} ({offboardingEmployees.length})
            </h3>
          </div>
          <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
            {offboardingEmployees.map(emp => {
              const pendencias = getActiveAssets(emp.id).length + getActiveLicenses(emp.id).length;
              return (
                <div 
                  key={emp.id} 
                  onClick={() => openEmployee(emp)}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${selectedEmployee?.id === emp.id ? 'bg-red-900/20 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'bg-black/40 border-gray-800 hover:border-gray-600'}`}
                >
                  <p className="font-bold text-white text-sm">{emp.nome}</p>
                  <p className="text-xs text-gray-500 mb-3">{emp.departamento}</p>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${pendencias > 0 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-brandGreen/20 text-brandGreen'}`}>
                      {pendencias > 0 ? `${pendencias} pendências` : 'Pronto (Limpo)'}
                    </span>
                    <ChevronRight className={`w-4 h-4 ${selectedEmployee?.id === emp.id ? 'text-red-400' : 'text-gray-600'}`} />
                  </div>
                </div>
              )
            })}
            {offboardingEmployees.length === 0 && (
              <div className="text-center py-12 px-4">
                <CheckCircle className="w-12 h-12 text-brandGreen mx-auto mb-3 opacity-50"/>
                <p className="text-gray-500 text-sm">Nenhum colaborador encontrado nesta lista.</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedEmployee ? (
            <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl animate-fade-in-up h-[600px] flex flex-col">
              <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-800">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-1">{selectedEmployee.nome}</h3>
                  <p className="text-gray-400">{selectedEmployee.email} • {selectedEmployee.departamento}</p>
                </div>
                {hasAccess('employees', 'edit') && (
                  <button 
                    onClick={() => finalizeOffboarding(selectedEmployee)} 
                    disabled={!canFinalize(selectedEmployee)}
                    className={`px-6 py-2.5 rounded-full font-bold flex items-center gap-2 transition-all shadow-lg ${canFinalize(selectedEmployee) ? 'bg-brandGreen hover:bg-brandGreenHover text-white shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                  >
                    <PowerOff className="w-4 h-4"/> Concluir Desligamento
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                
                <div>
                  <h4 className="font-bold text-white flex items-center gap-2 mb-4"><Laptop className="w-5 h-5 text-blue-400"/> Hardwares a Devolver</h4>
                  <div className="space-y-3">
                    {getActiveAssets(selectedEmployee.id).map(asset => (
                      <div key={asset.id} className="bg-black/50 border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-blue-500/30 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-white">{asset.asset_type}</p>
                          <p className="text-xs text-gray-400">{getAssetIdentDisplay(asset)}</p>
                        </div>
                        {hasAccess('assets', 'edit') && (
                          <button onClick={() => handleReturnAsset(asset.id)} className="text-xs font-bold text-blue-400 bg-blue-400/10 hover:bg-blue-400/20 px-3 py-1.5 rounded-lg transition-colors">Devolver</button>
                        )}
                      </div>
                    ))}
                    {getActiveAssets(selectedEmployee.id).length === 0 && (
                      <div className="bg-brandGreen/5 border border-brandGreen/20 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-brandGreen"/>
                        <p className="text-sm text-brandGreen font-semibold">Nenhum hardware pendente.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-white flex items-center gap-2 mb-4"><Key className="w-5 h-5 text-yellow-500"/> Acessos a Revogar</h4>
                  <div className="space-y-3">
                    {getActiveLicenses(selectedEmployee.id).map(asg => (
                      <div key={asg.assignment_id} className="bg-black/50 border border-gray-800 p-4 rounded-xl flex justify-between items-center group hover:border-yellow-500/30 transition-colors">
                        <div>
                          <p className="text-sm font-bold text-white">{asg.license.nome}</p>
                          <p className="text-xs text-gray-400">Licença vinculada</p>
                        </div>
                        {hasAccess('licenses', 'edit') && (
                          <button onClick={() => handleRevokeLicense(asg.assignment_id)} className="text-xs font-bold text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg transition-colors">Revogar</button>
                        )}
                      </div>
                    ))}
                    {getActiveLicenses(selectedEmployee.id).length === 0 && (
                      <div className="bg-brandGreen/5 border border-brandGreen/20 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-brandGreen"/>
                        <p className="text-sm text-brandGreen font-semibold">Nenhum acesso pendente.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 border-t border-gray-800 pt-6">
                  <h4 className="font-bold text-white flex items-center gap-2 mb-4"><CheckCircle className="w-5 h-5 text-brandGreen"/> Checklist Obrigatório + Termo</h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-3 bg-black/40 border border-gray-800 rounded-2xl px-4 py-3">
                      <input type="checkbox" checked={!!offboardingForm?.offboarding_onfly} onChange={(e) => setOffboardingForm(prev => ({ ...prev, offboarding_onfly: e.target.checked }))} className="accent-brandGreen w-4 h-4" />
                      <span className="text-gray-200 font-semibold">Onfly</span>
                    </label>
                    <label className="flex items-center gap-3 bg-black/40 border border-gray-800 rounded-2xl px-4 py-3">
                      <input type="checkbox" checked={!!offboardingForm?.offboarding_mega} onChange={(e) => setOffboardingForm(prev => ({ ...prev, offboarding_mega: e.target.checked }))} className="accent-brandGreen w-4 h-4" />
                      <span className="text-gray-200 font-semibold">MegaERP</span>
                    </label>
                    <label className="flex items-center gap-3 bg-black/40 border border-gray-800 rounded-2xl px-4 py-3">
                      <input type="checkbox" checked={!!offboardingForm?.offboarding_adm365} onChange={(e) => setOffboardingForm(prev => ({ ...prev, offboarding_adm365: e.target.checked }))} className="accent-brandGreen w-4 h-4" />
                      <span className="text-gray-200 font-semibold">Admin365</span>
                    </label>
                    <label className="flex items-center gap-3 bg-black/40 border border-gray-800 rounded-2xl px-4 py-3">
                      <input type="checkbox" checked={!!offboardingForm?.offboarding_license} onChange={(e) => setOffboardingForm(prev => ({ ...prev, offboarding_license: e.target.checked }))} className="accent-brandGreen w-4 h-4" />
                      <span className="text-gray-200 font-semibold">Equipamentos devolvidos</span>
                    </label>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-bold text-gray-400 mb-2">URL do termo de devolução assinado (Drive/OneDrive)</label>
                    <input
                      type="url"
                      value={offboardingForm?.termo_url || ''}
                      onChange={(e) => setOffboardingForm(prev => ({ ...prev, termo_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-black/50 border border-gray-700 focus:border-brandGreen transition-colors rounded-2xl p-3 text-white outline-none"
                    />
                  </div>

                  {hasAccess('employees', 'edit') && (
                    <div className="mt-4 flex flex-col md:flex-row gap-3">
                      <button onClick={saveChecklist} className="flex-1 bg-brandGreen hover:bg-brandGreenHover text-white py-3 rounded-2xl font-bold shadow-[0_4px_14px_rgba(16,185,129,0.25)] transition-all">
                        Salvar checklist
                      </button>
                      <div className="flex-1 bg-gray-900/60 border border-gray-800 rounded-2xl p-3 text-xs text-gray-400">
                        Você só consegue concluir quando: **sem pendências** + checklist completo + URL preenchida.
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-gray-900/40 border border-gray-800 border-dashed rounded-3xl h-[600px] flex flex-col items-center justify-center text-center p-8">
              <ShieldAlert className="w-16 h-16 text-gray-700 mb-4"/>
              <h3 className="text-xl font-bold text-gray-400 mb-2">Selecione um Colaborador</h3>
              <p className="text-gray-500 text-sm max-w-sm">Clique em um nome na fila ao lado para iniciar a revogação de acessos e devolução de equipamentos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}