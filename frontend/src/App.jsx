import React, { useState, useEffect } from 'react';
import { ShieldCheck, Monitor, Users, X, LayoutDashboard, Database, Smartphone, Wifi, Laptop, Briefcase, Edit2, Save, Wrench, FileCheck, Clock, Cpu } from 'lucide-react';

function App() {
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = useState(false);
  const [isAssignAssetModalOpen, setIsAssignAssetModalOpen] = useState(false);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const [isEditMaintenanceModalOpen, setIsEditMaintenanceModalOpen] = useState(false);
  const [editMaintenanceForm, setEditMaintenanceForm] = useState({ id: null, chamado: '', observacao: '' });
  
  const [viewAssetDetails, setViewAssetDetails] = useState(null); 
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editEmployeeData, setEditEmployeeData] = useState(null);

  const [activeEmployee, setActiveEmployee] = useState(null);
  const [activeAsset, setActiveAsset] = useState(null);
  const [selectedItemForAssign, setSelectedItemForAssign] = useState('');
  const [maintenanceForm, setMaintenanceForm] = useState({ chamado: '', observacao: '' });

  const [activeTab, setActiveTab] = useState('inventory');
  const [selectedCategory, setSelectedCategory] = useState('Todos');

  const getInitialAsset = (type) => ({ asset_type: type === 'Todos' ? 'Notebook' : type, status: 'Disponível', serial_number: '', patrimonio: '', modelo_notebook: '', garantia: '', status_garantia: 'No prazo', modelo_starlink: '', projeto: '', localizacao: '', email: '', senha: '', senha_roteador: '', responsavel: '', imei: '', numero: '', iccid: '', modelo_celular: '' });
  const [newAsset, setNewAsset] = useState(getInitialAsset('Todos'));
  const [newEmployee, setNewEmployee] = useState({ nome: '', email: '', departamento: '' });

  const fetchData = () => {
    fetch('http://localhost:8080/api/assets').then(res => res.json()).then(data => setAssets(data.data || []));
    fetch('http://localhost:8080/api/employees').then(res => res.json()).then(data => setEmployees(data.data || []));
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateAsset = (e) => { e.preventDefault(); fetch('http://localhost:8080/api/assets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAsset) }).then(() => { setIsAssetModalOpen(false); fetchData(); }); };
  const handleCreateEmployee = (e) => { e.preventDefault(); fetch('http://localhost:8080/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newEmployee) }).then(() => { setIsEmployeeModalOpen(false); setNewEmployee({ nome: '', email: '', departamento: '' }); fetchData(); }); };

  const submitAssignment = (e) => {
    e.preventDefault();
    const employeeId = activeEmployee ? activeEmployee.id : selectedItemForAssign;
    const assetId = activeAsset ? activeAsset.id : selectedItemForAssign;
    fetch(`http://localhost:8080/api/employees/${employeeId}/assign`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset_id: parseInt(assetId) }) })
    .then(() => { setIsAssignEmployeeModalOpen(false); setIsAssignAssetModalOpen(false); setSelectedItemForAssign(''); fetchData(); });
  };

  const handleAction = (assetId, action) => {
    if (!window.confirm(`Aplicar ação: ${action.toUpperCase()}?`)) return;
    fetch(`http://localhost:8080/api/assets/${assetId}/${action}`, { method: 'PUT' }).then(() => { fetchData(); });
  };

  const submitMaintenance = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8080/api/assets/${activeAsset.id}/maintenance`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(maintenanceForm) })
    .then(() => { setIsMaintenanceModalOpen(false); setMaintenanceForm({chamado: '', observacao: ''}); fetchData(); });
  };

  const resolveMaintenance = (assetId) => {
    if (!window.confirm(`Deseja devolver este equipamento para o estoque como "Disponível"?`)) return;
    fetch(`http://localhost:8080/api/assets/${assetId}/resolve-maintenance`, { method: 'PUT' }).then(() => { fetchData(); });
  };

  const openEditMaintenance = (log) => {
    setEditMaintenanceForm({ id: log.id, chamado: log.chamado || '', observacao: log.observacao || '' });
    setIsEditMaintenanceModalOpen(true);
  };

  const submitEditMaintenance = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8080/api/maintenance/${editMaintenanceForm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chamado: editMaintenanceForm.chamado, observacao: editMaintenanceForm.observacao }) })
    .then(async res => { if(!res.ok) { const err = await res.json(); throw new Error(err.error); } return res.json(); })
    .then(() => { setIsEditMaintenanceModalOpen(false); fetchData(); })
    .catch(err => alert("Erro ao atualizar: " + err.message));
  };

  const toggleEmployeeStatus = (empId, currentStatus) => {
    const isDesligando = currentStatus === 'Ativo' || !currentStatus;
    if(isDesligando && !window.confirm("Atenção: Desligar este colaborador removerá seus equipamentos. Continuar?")) return;
    fetch(`http://localhost:8080/api/employees/${empId}/toggle-status`, { method: 'PUT' }).then(() => { fetchData(); });
  };

  const toggleOffboarding = (empId, field, currentValue) => {
    const payload = { offboarding_onfly: field === 'onfly' ? !currentValue : false, offboarding_adm365: field === 'adm365' ? !currentValue : false, offboarding_license: field === 'license' ? !currentValue : false };
    const emp = employees.find(e => e.id === empId);
    if(field !== 'onfly') payload.offboarding_onfly = emp.offboarding_onfly;
    if(field !== 'adm365') payload.offboarding_adm365 = emp.offboarding_adm365;
    if(field !== 'license') payload.offboarding_license = emp.offboarding_license;
    fetch(`http://localhost:8080/api/employees/${empId}/offboarding`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(() => fetchData());
  };

  const saveEditEmployee = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8080/api/employees/${editEmployeeData.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editEmployeeData) })
    .then(() => { setEditEmployeeData(null); fetchData(); });
  };

  const openEditDetails = (asset) => {
    setEditFormData({
      asset_type: asset.asset_type, serial_number: asset.notebook?.serial_number || '', patrimonio: asset.notebook?.patrimonio || '', modelo_notebook: asset.notebook?.modelo || '', garantia: asset.notebook?.garantia || '', status_garantia: asset.notebook?.status_garantia || 'No prazo',
      modelo_starlink: asset.starlink?.modelo || '', projeto: asset.starlink?.projeto || '', localizacao: asset.starlink?.localizacao || '', responsavel: asset.starlink?.responsavel || asset.chip?.responsavel || asset.celular?.responsavel || '', email: asset.starlink?.email || '', senha: asset.starlink?.senha || '', senha_roteador: asset.starlink?.senha_roteador || '',
      imei: asset.celular?.imei || '', numero: asset.chip?.numero || '', iccid: asset.chip?.iccid || '', modelo_celular: asset.celular?.modelo || ''
    });
    setIsEditingDetails(true);
  };

  const saveEditDetails = (e) => {
    e.preventDefault();
    fetch(`http://localhost:8080/api/assets/${viewAssetDetails.id}/details`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editFormData) }).then(() => { setIsEditingDetails(false); setViewAssetDetails(null); fetchData(); });
  };

  const filteredAssets = selectedCategory === 'Todos' ? assets : assets.filter(a => a.asset_type === selectedCategory);
  const availableNotebooks = assets.filter(a => a.asset_type === 'Notebook' && a.status === 'Disponível');
  const maintenanceAssets = assets.filter(a => a.status === 'Manutenção');
  const offboardedEmployees = employees.filter(e => e.status === 'Desligado');

  return (
    <div className="min-h-screen bg-brandDark font-sans selection:bg-brandGreen selection:text-white pb-20">
      <nav className="border-b border-gray-800 bg-black p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-brandGreen w-8 h-8" />
            <span className="text-xl font-bold tracking-wider text-white">PSI Energy <span className="text-brandGreen">GovTI</span></span>
          </div>
          <div className="flex gap-6 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('dashboard')} className={`text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'text-brandGreen' : 'text-gray-400 hover:text-white'}`}><LayoutDashboard className="w-4 h-4"/> Dashboard</button>
            <button onClick={() => setActiveTab('inventory')} className={`text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'inventory' ? 'text-brandGreen' : 'text-gray-400 hover:text-white'}`}><Database className="w-4 h-4"/> Inventário</button>
            <button onClick={() => setActiveTab('employees')} className={`text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'employees' ? 'text-brandGreen' : 'text-gray-400 hover:text-white'}`}><Users className="w-4 h-4"/> Colaboradores</button>
            <button onClick={() => setActiveTab('maintenance')} className={`text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'maintenance' ? 'text-yellow-400' : 'text-gray-400 hover:text-white'}`}><Wrench className="w-4 h-4"/> Manutenção</button>
            <button onClick={() => setActiveTab('offboarding')} className={`text-sm font-semibold transition-colors flex items-center gap-2 ${activeTab === 'offboarding' ? 'text-red-400' : 'text-gray-400 hover:text-white'}`}><FileCheck className="w-4 h-4"/> Revogação (Offboarding)</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 mt-6">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-gray-800 rounded-full text-brandGreen"><Monitor className="w-6 h-6" /></div><h2 className="text-lg font-semibold text-gray-200">Total de Equipamentos</h2></div><p className="text-4xl font-bold text-white">{assets.length}</p></div>
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-gray-800 rounded-full text-yellow-400"><Wrench className="w-6 h-6" /></div><h2 className="text-lg font-semibold text-gray-200">Em Manutenção</h2></div><p className="text-4xl font-bold text-white">{maintenanceAssets.length}</p></div>
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl"><div className="flex items-center gap-4 mb-4"><div className="p-3 bg-gray-800 rounded-full text-red-400"><FileCheck className="w-6 h-6" /></div><h2 className="text-lg font-semibold text-gray-200">Desligamentos Registrados</h2></div><p className="text-4xl font-bold text-white">{offboardedEmployees.length}</p></div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="flex gap-8 items-start">
            <div className="w-64 flex-shrink-0 flex flex-col gap-2">
              <button onClick={() => { setNewAsset(getInitialAsset(selectedCategory)); setIsAssetModalOpen(true); }} className="mb-4 bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-3 rounded-2xl font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] w-full text-center">+ Novo Ativo</button>
              {[{ name: 'Todos', icon: <Database className="w-5 h-5" /> }, { name: 'Notebook', icon: <Laptop className="w-5 h-5" /> }, { name: 'Celular', icon: <Smartphone className="w-5 h-5" /> }, { name: 'Starlink', icon: <Wifi className="w-5 h-5" /> }, { name: 'CHIP', icon: <Cpu className="w-5 h-5" /> }].map(cat => (
                <button key={cat.name} onClick={() => setSelectedCategory(cat.name)} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left font-medium transition-all ${selectedCategory === cat.name ? 'bg-gray-800 text-brandGreen border border-gray-700' : 'text-gray-400 hover:bg-gray-900 hover:text-white border border-transparent'}`}>{cat.icon} {cat.name}</button>
              ))}
            </div>
            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-black/50 text-gray-400 border-b border-gray-800 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Equipamento</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Identificador Principal</th><th className="px-6 py-4 text-center">Ações</th></tr></thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-gray-800/50">
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">{asset.asset_type === 'Starlink' && <Wifi className="w-4 h-4 text-gray-400" />}{asset.asset_type === 'Notebook' && <Laptop className="w-4 h-4 text-gray-400" />}{asset.asset_type === 'Celular' && <Smartphone className="w-4 h-4 text-gray-400" />}{asset.asset_type === 'CHIP' && <Cpu className="w-4 h-4 text-gray-400" />}{asset.asset_type}</td>
                      <td className="px-6 py-4"><span className={`whitespace-nowrap inline-block px-3 py-1 border rounded-full text-xs font-medium ${asset.status === 'Disponível' ? 'bg-green-900/30 text-brandGreen border-brandGreen/20' : asset.status === 'Em uso' ? 'bg-blue-900/30 text-blue-400 border-blue-400/20' : 'bg-yellow-900/30 text-yellow-400 border-yellow-400/20'}`}>{asset.status}</span></td>
                      <td className="px-6 py-4">
                        {asset.asset_type === 'Notebook' && asset.notebook && (<div><p className="font-semibold text-gray-200">Patrimônio: {asset.notebook.patrimonio}</p><p className="text-xs text-gray-500">Mod: {asset.notebook.modelo}</p></div>)}
                        {asset.asset_type === 'Starlink' && asset.starlink && (<div><p className="font-semibold text-gray-200">Projeto: {asset.starlink.projeto}</p><p className="text-xs text-gray-500">Local: {asset.starlink.localizacao}</p></div>)}
                        {asset.asset_type === 'Celular' && asset.celular && (<div><p className="font-semibold text-gray-200">IMEI: {asset.celular.imei}</p><p className="text-xs text-gray-500">Mod: {asset.celular.modelo}</p></div>)}
                        {asset.asset_type === 'CHIP' && asset.chip && (<div><p className="font-semibold text-gray-200">Linha: {asset.chip.numero}</p><p className="text-xs text-gray-500">ICCID: {asset.chip.iccid}</p></div>)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => { setActiveAsset(asset); setIsHistoryModalOpen(true); }} className="bg-purple-900/30 text-purple-400 px-3 py-1 rounded hover:bg-purple-900/60 font-semibold transition-colors flex items-center gap-1"><Clock className="w-3 h-3"/> Histórico</button>
                          <button onClick={() => { setViewAssetDetails(asset); setIsEditingDetails(false); }} className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded hover:bg-blue-900/60 font-semibold transition-colors">Detalhes</button>
                          {asset.status === 'Disponível' && asset.asset_type === 'Notebook' && <button onClick={() => { setActiveAsset(asset); setIsAssignAssetModalOpen(true); setSelectedItemForAssign(''); }} className="bg-brandGreen/20 text-brandGreen px-3 py-1 rounded hover:bg-brandGreen/40 font-semibold transition-colors">Atribuir</button>}
                          {asset.status === 'Em uso' && <button onClick={() => handleAction(asset.id, 'unassign')} className="bg-red-900/30 text-red-400 px-3 py-1 rounded hover:bg-red-900/60 font-semibold transition-colors">Remover</button>}
                          {asset.status !== 'Manutenção' && <button onClick={() => { setActiveAsset(asset); setIsMaintenanceModalOpen(true); }} className="bg-yellow-900/30 text-yellow-400 px-3 py-1 rounded hover:bg-yellow-900/60 font-semibold transition-colors">Manutenção</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Wrench className="text-yellow-400"/> Equipamentos em Manutenção</h2></div>
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-black/50 text-gray-400 border-b border-gray-800 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Equipamento</th><th className="px-6 py-4">Nº Chamado</th><th className="px-6 py-4">Observação / Tratativa</th><th className="px-6 py-4 text-center">Ações</th></tr></thead>
              <tbody className="divide-y divide-gray-800">
                {maintenanceAssets.length === 0 ? (<tr><td colSpan="4" className="text-center py-8 text-gray-500">Nenhum equipamento em manutenção no momento.</td></tr>) : 
                maintenanceAssets.map(asset => {
                  const activeLog = asset.maintenance_logs?.find(log => !log.resolved_at);
                  return (
                  <tr key={asset.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-bold text-white">{asset.asset_type} {asset.notebook ? `- ${asset.notebook.patrimonio}` : ''}</td>
                    <td className="px-6 py-4 text-yellow-400 font-mono">{activeLog?.chamado || '-'}</td>
                    <td className="px-6 py-4 text-gray-400 italic max-w-xs truncate">{activeLog?.observacao || 'Sem observações'}</td>
                    <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                            <button onClick={() => activeLog ? openEditMaintenance(activeLog) : null} className="bg-blue-900/20 text-blue-400 px-3 py-2 rounded-lg font-semibold hover:bg-blue-900/60 transition-colors flex items-center gap-1 border border-blue-900/50"><Edit2 className="w-3 h-3"/> Editar</button>
                            <button onClick={() => resolveMaintenance(asset.id)} className="bg-brandGreen/20 text-brandGreen px-4 py-2 rounded-lg font-semibold hover:bg-brandGreen hover:text-white transition-colors">Resolver</button>
                        </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'offboarding' && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="p-6 border-b border-gray-800"><h2 className="text-xl font-bold text-white flex items-center gap-2"><FileCheck className="text-red-400"/> Checklist de Desligamentos (Offboarding)</h2><p className="text-gray-400 text-sm mt-1">Acompanhe a revogação de acessos dos colaboradores desligados para auditoria.</p></div>
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-black/50 text-gray-400 border-b border-gray-800 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Colaborador</th><th className="px-6 py-4">Data Desligamento</th><th className="px-6 py-4 text-center">Checklist de Revogação de Acessos</th></tr></thead>
              <tbody className="divide-y divide-gray-800">
                {offboardedEmployees.length === 0 ? (<tr><td colSpan="3" className="text-center py-8 text-gray-500">Nenhum colaborador desligado registrado.</td></tr>) : 
                offboardedEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-gray-800/50">
                    <td className="px-6 py-4 font-bold text-white"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full flex items-center justify-center font-bold bg-gray-800 text-gray-500">{emp.nome.charAt(0).toUpperCase()}</div>{emp.nome}</div></td>
                    <td className="px-6 py-4 text-gray-400">{emp.offboarding_date ? new Date(emp.offboarding_date).toLocaleDateString('pt-BR') : 'Não registrada'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={emp.offboarding_onfly} onChange={() => toggleOffboarding(emp.id, 'onfly', emp.offboarding_onfly)} className="w-4 h-4 accent-brandGreen bg-black border-gray-700 rounded"/> Onfly</label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={emp.offboarding_adm365} onChange={() => toggleOffboarding(emp.id, 'adm365', emp.offboarding_adm365)} className="w-4 h-4 accent-brandGreen bg-black border-gray-700 rounded"/> Bloquear ADM 365</label>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={emp.offboarding_license} onChange={() => toggleOffboarding(emp.id, 'license', emp.offboarding_license)} className="w-4 h-4 accent-brandGreen bg-black border-gray-700 rounded"/> Remover Licença</label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'employees' && (
          <div>
            <div className="flex justify-end mb-4"><button onClick={() => setIsEmployeeModalOpen(true)} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2 rounded-full font-semibold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]">+ Novo Colaborador</button></div>
            <div className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden shadow-xl">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-black/50 text-gray-400 border-b border-gray-800 uppercase text-xs font-semibold"><tr><th className="px-6 py-4">Nome & Status</th><th className="px-6 py-4">Departamento</th><th className="px-6 py-4 text-center">Ativos Vinculados</th><th className="px-6 py-4 text-center">Ações</th></tr></thead>
                <tbody className="divide-y divide-gray-800">
                  {employees.map(emp => {
                    const assignedNotebook = emp.notebook ? assets.find(a => a.asset_type === 'Notebook' && a.notebook?.patrimonio === emp.notebook) : null;
                    const isDesligado = emp.status === 'Desligado';
                    return (
                    <tr key={emp.id} className={`hover:bg-gray-800/50 ${isDesligado ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4 font-bold text-white flex flex-col gap-1">
                        <div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${isDesligado ? 'bg-gray-800 text-gray-500' : 'bg-brandGreen/20 text-brandGreen'}`}>{emp.nome.charAt(0).toUpperCase()}</div>{emp.nome}</div>
                        <span className={`ml-11 text-[10px] uppercase font-bold tracking-wider ${isDesligado ? 'text-red-500' : 'text-brandGreen'}`}>{emp.status || 'Ativo'}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-400">{emp.departamento}</td>
                      <td className="px-6 py-4 text-center font-medium">
                        {emp.notebook ? <span className="whitespace-nowrap inline-block text-blue-400 bg-blue-900/20 px-3 py-1 rounded-full border border-blue-400/20">Notebook: {emp.notebook}</span> : <span className="text-gray-500">Nenhum</span>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => setEditEmployeeData(emp)} className="text-xs font-semibold text-blue-400 hover:text-white transition-colors bg-blue-900/20 px-3 py-2 rounded flex items-center gap-1 border border-blue-900/50"><Edit2 className="w-3 h-3"/> Perfil</button>
                          {isDesligado ? (
                            <button onClick={() => toggleEmployeeStatus(emp.id, emp.status)} className="text-xs font-semibold text-brandGreen hover:bg-brandGreen/20 transition-colors bg-gray-800 px-3 py-2 rounded">Reativar</button>
                          ) : (
                            <>
                              {emp.notebook ? (<button onClick={() => { if(assignedNotebook) { handleAction(assignedNotebook.id, 'unassign'); } else { alert("Notebook não encontrado."); } }} className="text-xs font-semibold text-red-400 hover:text-white transition-colors bg-red-900/30 px-3 py-2 rounded border border-red-900/50">Remover Eqp.</button>) : (<button onClick={() => { setActiveEmployee(emp); setIsAssignEmployeeModalOpen(true); setSelectedItemForAssign(''); }} className="text-xs font-semibold text-brandGreen hover:text-white transition-colors bg-brandGreen/10 px-3 py-2 rounded border border-brandGreen/20">Atribuir Eqp.</button>)}
                              <button onClick={() => toggleEmployeeStatus(emp.id, emp.status)} className="text-xs font-semibold text-gray-400 hover:text-red-400 transition-colors bg-gray-800 hover:bg-red-900/20 px-3 py-2 rounded ml-2">Desligar</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: EDITAR MANUTENÇÃO */}
      {isEditMaintenanceModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h2 className="text-xl font-bold text-white flex items-center gap-2"><Edit2 className="w-5 h-5 text-blue-400"/> Editar Manutenção</h2><button onClick={() => setIsEditMaintenanceModalOpen(false)} className="text-gray-400 hover:text-blue-400"><X className="w-6 h-6" /></button></div>
            <form onSubmit={submitEditMaintenance} className="flex flex-col gap-4">
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Nº do Chamado Associado</label><input type="text" required value={editMaintenanceForm.chamado} onChange={(e) => setEditMaintenanceForm({...editMaintenanceForm, chamado: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-blue-400 outline-none" placeholder="Ex: INC-10293" /></div>
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Observação / Defeito</label><textarea required value={editMaintenanceForm.observacao} onChange={(e) => setEditMaintenanceForm({...editMaintenanceForm, observacao: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-blue-400 outline-none h-24 resize-none" placeholder="Atualize o status do conserto..." /></div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-full font-bold mt-4 shadow-lg transition-colors flex items-center justify-center gap-2"><Save className="w-5 h-5"/> Atualizar Tratativa</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTÓRICO DE ATRIBUIÇÕES */}
      {isHistoryModalOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Clock className="text-purple-400"/> Histórico de Donos ({activeAsset.notebook?.patrimonio || activeAsset.asset_type})</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-gray-400 hover:text-white p-2"><X className="w-6 h-6" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto pr-2">
              {(!activeAsset.assignments || activeAsset.assignments.length === 0) ? (
                <p className="text-gray-500 text-center py-4">Este equipamento nunca foi atribuído a ninguém.</p>
              ) : (
                <div className="space-y-4">
                  {activeAsset.assignments.sort((a,b) => new Date(b.assigned_at) - new Date(a.assigned_at)).map((assignment, idx) => (
                    <div key={idx} className="bg-black border border-gray-800 p-4 rounded-xl flex justify-between items-center">
                      <div><p className="text-brandGreen font-bold">{assignment.employee?.nome || 'Colaborador Desconhecido'}</p><p className="text-xs text-gray-500 mt-1">Status na época: Recebido</p></div>
                      <div className="text-right text-sm">
                        <p className="text-gray-300"><strong>Início:</strong> {new Date(assignment.assigned_at).toLocaleDateString('pt-BR')} {new Date(assignment.assigned_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</p>
                        <p className={assignment.returned_at ? 'text-gray-300' : 'text-blue-400 font-bold'}><strong>Fim:</strong> {assignment.returned_at ? new Date(assignment.returned_at).toLocaleDateString('pt-BR') : 'Em uso atualmente'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENVIAR PARA MANUTENÇÃO */}
      {isMaintenanceModalOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h2 className="text-xl font-bold text-white">Enviar para Manutenção</h2><button onClick={() => setIsMaintenanceModalOpen(false)} className="text-gray-400 hover:text-yellow-400"><X className="w-6 h-6" /></button></div>
            <form onSubmit={submitMaintenance} className="flex flex-col gap-4">
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Nº do Chamado Associado</label><input type="text" required value={maintenanceForm.chamado} onChange={(e) => setMaintenanceForm({...maintenanceForm, chamado: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-yellow-400 outline-none" placeholder="Ex: INC-10293" /></div>
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Observação / Defeito</label><textarea required value={maintenanceForm.observacao} onChange={(e) => setMaintenanceForm({...maintenanceForm, observacao: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-yellow-400 outline-none h-24 resize-none" placeholder="Ex: Tela piscando, será trocada pela Dell..." /></div>
              <button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-400 text-black py-4 rounded-full font-bold mt-4 shadow-lg transition-colors">Registrar Manutenção</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR COLABORADOR */}
      {editEmployeeData && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h2 className="text-xl font-bold text-white">Perfil do Colaborador</h2><button onClick={() => setEditEmployeeData(null)} className="text-gray-400 hover:text-brandGreen"><X className="w-6 h-6" /></button></div>
            <form onSubmit={saveEditEmployee} className="flex flex-col gap-4">
              <input type="text" placeholder="Nome" required value={editEmployeeData.nome} onChange={(e) => setEditEmployeeData({...editEmployeeData, nome: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-brandGreen outline-none" />
              <input type="email" placeholder="E-mail" required value={editEmployeeData.email} onChange={(e) => setEditEmployeeData({...editEmployeeData, email: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-brandGreen outline-none" />
              <input type="text" placeholder="Departamento" required value={editEmployeeData.departamento} onChange={(e) => setEditEmployeeData({...editEmployeeData, departamento: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-brandGreen outline-none" />
              <div className="pt-2 border-t border-gray-800"><label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2"><FileCheck className="w-4 h-4"/> URL do Termo de Responsabilidade</label><input type="url" placeholder="Ex: https://sharepoint.com/termo.pdf" value={editEmployeeData.termo_url || ''} onChange={(e) => setEditEmployeeData({...editEmployeeData, termo_url: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-brandGreen focus:border-brandGreen outline-none text-sm font-mono" /></div>
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-2 shadow-lg shadow-brandGreen/20">Salvar Alterações</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VER/EDITAR DETALHES DO EQUIPAMENTO */}
      {viewAssetDetails && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white">{isEditingDetails ? 'Editar Ativo' : 'Detalhes do Ativo'}</h2>
              <div className="flex gap-2">
                {!isEditingDetails && (<button onClick={() => openEditDetails(viewAssetDetails)} className="text-brandGreen hover:text-brandGreenHover bg-brandGreen/10 p-2 rounded-lg flex items-center gap-2 text-sm"><Edit2 className="w-4 h-4"/> Editar</button>)}
                <button onClick={() => { setViewAssetDetails(null); setIsEditingDetails(false); }} className="text-gray-400 hover:text-white p-2"><X className="w-6 h-6" /></button>
              </div>
            </div>
            {!isEditingDetails ? (
              <div className="space-y-4">
                {viewAssetDetails.asset_type === 'Starlink' && viewAssetDetails.starlink && (<><div className="bg-black/50 p-4 rounded-xl border border-gray-800"><p className="text-sm text-brandGreen font-semibold mb-2 flex items-center gap-2"><Briefcase className="w-4 h-4"/> Local</p><p className="text-gray-300"><strong className="text-gray-500">Projeto:</strong> {viewAssetDetails.starlink.projeto}</p><p className="text-gray-300"><strong className="text-gray-500">Modelo:</strong> {viewAssetDetails.starlink.modelo}</p><p className="text-gray-300"><strong className="text-gray-500">Localização:</strong> {viewAssetDetails.starlink.localizacao}</p><p className="text-gray-300"><strong className="text-gray-500">Resp.:</strong> {viewAssetDetails.starlink.responsavel}</p></div><div className="bg-black/50 p-4 rounded-xl border border-gray-800"><p className="text-sm text-brandGreen font-semibold mb-2 flex items-center gap-2"><Wifi className="w-4 h-4"/> Credenciais</p><p className="text-gray-300"><strong className="text-gray-500">E-mail:</strong> {viewAssetDetails.starlink.email}</p><p className="text-gray-300"><strong className="text-gray-500">Conta:</strong> {viewAssetDetails.starlink.senha}</p><p className="text-gray-300"><strong className="text-gray-500">Wi-Fi:</strong> {viewAssetDetails.starlink.senha_roteador || "Não configurada"}</p></div></>)}
                {viewAssetDetails.asset_type === 'Notebook' && viewAssetDetails.notebook && (<div className="bg-black/50 p-4 rounded-xl border border-gray-800 space-y-2"><p className="text-gray-300"><strong className="text-gray-500">Modelo:</strong> {viewAssetDetails.notebook.modelo}</p><p className="text-gray-300"><strong className="text-gray-500">S/N:</strong> {viewAssetDetails.notebook.serial_number}</p><p className="text-gray-300"><strong className="text-gray-500">Patrimônio:</strong> {viewAssetDetails.notebook.patrimonio}</p><p className="text-gray-300"><strong className="text-gray-500">Garantia:</strong> {viewAssetDetails.notebook.garantia} ({viewAssetDetails.notebook.status_garantia})</p></div>)}
                {viewAssetDetails.asset_type === 'Celular' && viewAssetDetails.celular && (<div className="bg-black/50 p-4 rounded-xl border border-gray-800 space-y-2"><p className="text-gray-300"><strong className="text-gray-500">Modelo:</strong> {viewAssetDetails.celular.modelo}</p><p className="text-gray-300"><strong className="text-gray-500">IMEI:</strong> {viewAssetDetails.celular.imei}</p><p className="text-gray-300"><strong className="text-gray-500">Responsável:</strong> {viewAssetDetails.celular.responsavel}</p></div>)}
                {viewAssetDetails.asset_type === 'CHIP' && viewAssetDetails.chip && (<div className="bg-black/50 p-4 rounded-xl border border-gray-800 space-y-2"><p className="text-gray-300"><strong className="text-gray-500">Número da Linha:</strong> {viewAssetDetails.chip.numero}</p><p className="text-gray-300"><strong className="text-gray-500">ICCID:</strong> {viewAssetDetails.chip.iccid}</p><p className="text-gray-300"><strong className="text-gray-500">Responsável:</strong> {viewAssetDetails.chip.responsavel}</p></div>)}
              </div>
            ) : (
              <form onSubmit={saveEditDetails} className="flex flex-col gap-3">
                {viewAssetDetails.asset_type === 'Notebook' && (<><input type="text" placeholder="Patrimônio" value={editFormData.patrimonio} onChange={e => setEditFormData({...editFormData, patrimonio: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Serial Number" value={editFormData.serial_number} onChange={e => setEditFormData({...editFormData, serial_number: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Modelo" value={editFormData.modelo_notebook} onChange={e => setEditFormData({...editFormData, modelo_notebook: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="date" value={editFormData.garantia} onChange={e => setEditFormData({...editFormData, garantia: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><select value={editFormData.status_garantia} onChange={e => setEditFormData({...editFormData, status_garantia: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white"><option value="No prazo">No prazo</option><option value="Vencido">Vencido</option></select></>)}
                {viewAssetDetails.asset_type === 'Starlink' && (<><input type="text" placeholder="Projeto" value={editFormData.projeto} onChange={e => setEditFormData({...editFormData, projeto: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Modelo" value={editFormData.modelo_starlink} onChange={e => setEditFormData({...editFormData, modelo_starlink: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Localização" value={editFormData.localizacao} onChange={e => setEditFormData({...editFormData, localizacao: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Responsável" value={editFormData.responsavel} onChange={e => setEditFormData({...editFormData, responsavel: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="email" placeholder="E-mail" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Senha Conta" value={editFormData.senha} onChange={e => setEditFormData({...editFormData, senha: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Senha Wi-Fi" value={editFormData.senha_roteador} onChange={e => setEditFormData({...editFormData, senha_roteador: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /></>)}
                {viewAssetDetails.asset_type === 'Celular' && (<><input type="text" placeholder="Modelo" value={editFormData.modelo_celular} onChange={e => setEditFormData({...editFormData, modelo_celular: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="IMEI" value={editFormData.imei} onChange={e => setEditFormData({...editFormData, imei: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Responsável" value={editFormData.responsavel} onChange={e => setEditFormData({...editFormData, responsavel: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /></>)}
                {viewAssetDetails.asset_type === 'CHIP' && (<><input type="text" placeholder="Número" value={editFormData.numero} onChange={e => setEditFormData({...editFormData, numero: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="ICCID" value={editFormData.iccid} onChange={e => setEditFormData({...editFormData, iccid: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /><input type="text" placeholder="Responsável" value={editFormData.responsavel} onChange={e => setEditFormData({...editFormData, responsavel: e.target.value})} className="bg-black border border-gray-700 rounded-lg p-2 text-white" /></>)}
                <div className="flex gap-2 mt-4"><button type="button" onClick={() => setIsEditingDetails(false)} className="flex-1 bg-gray-800 text-gray-300 py-3 rounded-lg font-bold">Cancelar</button><button type="submit" className="flex-1 bg-brandGreen text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Salvar</button></div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAIS: ATRIBUIR E CRIAR EQUIPAMENTOS (COM CELULAR E CHIP) */}
      {isAssignEmployeeModalOpen && activeEmployee && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h2 className="text-xl font-bold text-white">Atribuir a {activeEmployee.nome.split(' ')[0]}</h2><button onClick={() => setIsAssignEmployeeModalOpen(false)} className="text-gray-400 hover:text-brandGreen"><X className="w-6 h-6" /></button></div>
            <form onSubmit={submitAssignment} className="flex flex-col gap-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Selecione um Notebook Disponível</label>
              <select required value={selectedItemForAssign} onChange={(e) => setSelectedItemForAssign(e.target.value)} className="w-full bg-black border border-brandGreen/50 rounded-xl p-3 text-white focus:border-brandGreen outline-none"><option value="" disabled>Escolha na lista...</option>{availableNotebooks.length === 0 && <option disabled>Nenhum notebook disponível no estoque!</option>}{availableNotebooks.map(nb => (<option key={nb.id} value={nb.id}>{nb.notebook?.patrimonio} - {nb.notebook?.modelo}</option>))}</select>
              <button type="submit" disabled={availableNotebooks.length === 0} className="w-full bg-brandGreen hover:bg-brandGreenHover disabled:bg-gray-700 disabled:text-gray-500 text-white py-4 rounded-full font-bold mt-4 shadow-lg transition-colors">Confirmar Atribuição</button>
            </form>
          </div>
        </div>
      )}
      {isAssignAssetModalOpen && activeAsset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h2 className="text-xl font-bold text-white">Atribuir {activeAsset.notebook?.patrimonio}</h2><button onClick={() => setIsAssignAssetModalOpen(false)} className="text-gray-400 hover:text-brandGreen"><X className="w-6 h-6" /></button></div>
            <form onSubmit={submitAssignment} className="flex flex-col gap-4">
              <label className="block text-sm font-medium text-gray-400 mb-1">Selecione o Colaborador</label>
              <select required value={selectedItemForAssign} onChange={(e) => setSelectedItemForAssign(e.target.value)} className="w-full bg-black border border-brandGreen/50 rounded-xl p-3 text-white focus:border-brandGreen outline-none"><option value="" disabled>Escolha na lista...</option>{employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.nome} - {emp.departamento}</option>))}</select>
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-4 shadow-lg transition-colors">Confirmar Atribuição</button>
            </form>
          </div>
        </div>
      )}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h2 className="text-xl font-bold text-white">Cadastrar Colaborador</h2><button onClick={() => setIsEmployeeModalOpen(false)} className="text-gray-400 hover:text-brandGreen"><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleCreateEmployee} className="flex flex-col gap-4">
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Nome Completo</label><input type="text" required value={newEmployee.nome} onChange={(e) => setNewEmployee({...newEmployee, nome: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-400 mb-1">E-mail Corporativo</label><input type="email" required value={newEmployee.email} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-400 mb-1">Departamento</label><input type="text" placeholder="Ex: Financeiro, TI, RH" required value={newEmployee.departamento} onChange={(e) => setNewEmployee({...newEmployee, departamento: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" /></div>
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-4 shadow-lg shadow-brandGreen/20">Salvar Colaborador</button>
            </form>
          </div>
        </div>
      )}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4"><h2 className="text-xl font-bold text-white">Cadastrar Ativo</h2><button onClick={() => setIsAssetModalOpen(false)} className="text-gray-400 hover:text-brandGreen"><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleCreateAsset} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label><select value={newAsset.asset_type} onChange={(e) => setNewAsset({...newAsset, asset_type: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none"><option value="Notebook">Notebook</option><option value="Celular">Aparelho Celular</option><option value="CHIP">Linha Telefônica / CHIP</option><option value="Starlink">Antena Starlink</option></select></div>
                <div><label className="block text-sm font-medium text-gray-400 mb-1">Status</label><select value={newAsset.status} onChange={(e) => setNewAsset({...newAsset, status: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none"><option value="Disponível">Disponível</option><option value="Em uso">Em uso</option><option value="Manutenção">Manutenção</option><option value="Descartado">Descartado</option></select></div>
              </div>
              {newAsset.asset_type === 'Notebook' && (<><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Serial Number" required value={newAsset.serial_number} onChange={(e) => setNewAsset({...newAsset, serial_number: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white outline-none" /><input type="text" placeholder="Patrimônio" required value={newAsset.patrimonio} onChange={(e) => setNewAsset({...newAsset, patrimonio: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white outline-none" /></div><div className="grid grid-cols-3 gap-4"><input type="text" placeholder="Modelo" required value={newAsset.modelo_notebook} onChange={(e) => setNewAsset({...newAsset, modelo_notebook: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white outline-none" /><input type="date" required value={newAsset.garantia} onChange={(e) => setNewAsset({...newAsset, garantia: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white outline-none text-sm" /><select value={newAsset.status_garantia} onChange={(e) => setNewAsset({...newAsset, status_garantia: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white outline-none"><option value="No prazo">No prazo</option><option value="Vencido">Vencido</option></select></div></>)}
              {newAsset.asset_type === 'Starlink' && (<><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Modelo" required value={newAsset.modelo_starlink} onChange={(e) => setNewAsset({...newAsset, modelo_starlink: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /><input type="text" placeholder="Projeto" required value={newAsset.projeto} onChange={(e) => setNewAsset({...newAsset, projeto: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /></div><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Localização" required value={newAsset.localizacao} onChange={(e) => setNewAsset({...newAsset, localizacao: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /><input type="text" placeholder="Responsável" required value={newAsset.responsavel} onChange={(e) => setNewAsset({...newAsset, responsavel: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /></div><div className="grid grid-cols-3 gap-4"><input type="email" placeholder="E-mail" required value={newAsset.email} onChange={(e) => setNewAsset({...newAsset, email: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /><input type="text" placeholder="Senha Conta" required value={newAsset.senha} onChange={(e) => setNewAsset({...newAsset, senha: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /><input type="text" placeholder="Senha Wi-Fi (Opcional)" value={newAsset.senha_roteador} onChange={(e) => setNewAsset({...newAsset, senha_roteador: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /></div></>)}
              {newAsset.asset_type === 'Celular' && (<><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="Modelo do Aparelho" required value={newAsset.modelo_celular} onChange={(e) => setNewAsset({...newAsset, modelo_celular: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /><input type="text" placeholder="IMEI" required maxLength={15} value={newAsset.imei} onChange={(e) => setNewAsset({...newAsset, imei: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /></div><div className="mt-4"><input type="text" placeholder="Responsável pelo Equipamento" required value={newAsset.responsavel} onChange={(e) => setNewAsset({...newAsset, responsavel: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white" /></div></>)}
              {newAsset.asset_type === 'CHIP' && (<><div className="grid grid-cols-2 gap-4"><input type="text" placeholder="ICCID (Cód. do Chip)" required maxLength={20} value={newAsset.iccid} onChange={(e) => setNewAsset({...newAsset, iccid: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /><input type="text" placeholder="Número (Linha)" required value={newAsset.numero} onChange={(e) => setNewAsset({...newAsset, numero: e.target.value})} className="bg-black border border-gray-700 rounded-xl p-3 text-white" /></div><div className="mt-4"><input type="text" placeholder="Responsável pela Linha" required value={newAsset.responsavel} onChange={(e) => setNewAsset({...newAsset, responsavel: e.target.value})} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white" /></div></>)}
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-6 shadow-lg shadow-brandGreen/20">Registrar Equipamento</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;