/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, LayoutDashboard, Database, CreditCard, UploadCloud, DownloadCloud, FileSignature, PowerOff, Shield, KeyRound, Tag, AlertTriangle, Info, Users, Wrench, FileCheck } from 'lucide-react';

import DashboardModule from './modules/DashboardModule';
import AdminModule from './modules/AdminModule';
import InventoryModule from './modules/InventoryModule';
import EmployeesModule from './modules/EmployeesModule';
import MaintenanceModule from './modules/MaintenanceModule';
import ImportModule from './modules/ImportModule';
import ExportModule from './modules/ExportModule';
import LicensesModule from './modules/LicensesModule';
import ContractsModule from './modules/ContractsModule';
import CatalogModule from './modules/CatalogModule';

import { roleTemplates } from './constants/permissions';
import { getAuthHeaders, formatCurrency } from './utils/helpers';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  
  // Estado Global de Loading adicionado
  const [isLoading, setIsLoading] = useState(false);
  
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [contracts, setContracts] = useState([]); 
  const [catalogItems, setCatalogItems] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false, confirmText: 'Confirmar' });
  const requestConfirm = (title, message, onConfirm, isDanger = false, confirmText = 'Confirmar') => { setConfirmDialog({ isOpen: true, title, message, onConfirm, isDanger, confirmText }); };

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', cargo: 'Gestor' });

  useEffect(() => {
    const savedUser = sessionStorage.getItem('logged_user');
    const token = sessionStorage.getItem('jwt_token');
    if (savedUser && token) setCurrentUser(JSON.parse(savedUser));
  }, []);

  // LÓGICA DE CARREGAMENTO (DELAY DE 1 SEGUNDO GARANTIDO NA NAVEGAÇÃO)
  const fetchData = () => {
    setIsLoading(true);
    const startTime = Date.now(); // Marca o tempo que começou a buscar
    
    Promise.all([
      fetch('http://localhost:8080/api/assets', { headers: getAuthHeaders() })
        .then(res => { if(res.status===401) handleLogout(); return res.json(); }).catch(() => ({data: []})),
      fetch('http://localhost:8080/api/employees', { headers: getAuthHeaders() })
        .then(res => res.json()).catch(() => ({data: []})),
      fetch('http://localhost:8080/api/licenses', { headers: getAuthHeaders() })
        .then(res => res.json()).catch(() => ({data: []})),
      fetch('http://localhost:8080/api/contracts', { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : {data: []}).catch(() => ({data: []})),
      fetch('http://localhost:8080/api/catalog', { headers: getAuthHeaders() })
        .then(res => res.ok ? res.json() : {data: []}).catch(() => ({data: []}))
    ])
    .then(([assetsData, empData, licData, contData, catData]) => {
      setAssets(assetsData.data || []);
      setEmployees(empData.data || []);
      setLicenses(licData.data || []);
      setContracts(contData.data || []);
      setCatalogItems(catData.data || []);
    })
    .finally(() => {
      // Calcula quanto tempo a API demorou. Se foi rápido demais, segura o loading 
      // até completar 1000ms (1 segundo) para o efeito visual da tela.
      const elapsedTime = Date.now() - startTime;
      const delayRequired = Math.max(1000 - elapsedTime, 0);
      
      setTimeout(() => {
        setIsLoading(false);
      }, delayRequired);
    });
  };

  const fetchAdminData = () => {
    fetch('http://localhost:8080/api/users', { headers: getAuthHeaders() }).then(res => res.json()).then(data => { const usersFromDB = (data.data || []).map(u => ({ ...u, permissions: u.permissions_json ? JSON.parse(u.permissions_json) : (roleTemplates[u.cargo] || {}) })); setSystemUsers(usersFromDB); }).catch(e => { if(e.message.includes('401')) handleLogout(); });
    fetch('http://localhost:8080/api/audit-logs', { headers: getAuthHeaders() }).then(res => res.json()).then(data => setAuditLogs(data.data || []));
  };

  const registerLog = (action, module, details) => {
    const logEntry = { user: currentUser ? currentUser.nome : 'Sistema', action, module, details };
    fetch('http://localhost:8080/api/audit-logs', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(logEntry) }).then(() => { if (currentUser?.cargo === 'Administrator') fetchAdminData(); });
  };

  useEffect(() => { 
    if (currentUser) { fetchData(); if (currentUser.cargo === 'Administrator') fetchAdminData(); } 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    fetch('http://localhost:8080/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) })
    .then(async res => { if(!res.ok) throw new Error((await res.json()).error); return res.json(); })
    .then(data => {
        const loggedUser = data.data; 
        loggedUser.permissions = loggedUser.permissions_json ? JSON.parse(loggedUser.permissions_json) : (roleTemplates[loggedUser.cargo] || {});
        sessionStorage.setItem('jwt_token', data.token);
        sessionStorage.setItem('logged_user', JSON.stringify(loggedUser));
        setCurrentUser(loggedUser); 
        setTimeout(() => { registerLog('LOGIN', 'Autenticação', `Acessou o sistema.`); }, 500);
    }).catch(err => { alert("Acesso Negado: E-mail ou senha incorretos."); });
  };

  const handleLogout = () => { registerLog('LOGOUT', 'Autenticação', `Saiu do sistema.`); sessionStorage.clear(); setCurrentUser(null); setLoginForm({ email: '', senha: '' }); };

  const hasAccess = (module, requiredLevel = 'read') => { if (!currentUser) return false; if (currentUser.cargo === 'Administrator') return true; const perm = currentUser.permissions[module]; if (!perm || perm === 'none') return false; if (requiredLevel === 'read') return perm === 'read' || perm === 'edit'; if (requiredLevel === 'edit') return perm === 'edit'; return false; };

  const handleRoleChange = (cargo) => setNewUser({ ...newUser, cargo: cargo, permissions: { ...roleTemplates[cargo] } });
  
  const handleCreateSystemUser = async (e) => { 
    e.preventDefault(); 
    const payload = { ...newUser, permissions_json: JSON.stringify(newUser.permissions) }; 
    try {
      const res = await fetch('http://localhost:8080/api/users', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error("Erro");
      setIsUserModalOpen(false); fetchAdminData(); registerLog('CREATE', 'Segurança', `Criou usuário ${newUser.nome}`); 
    } catch(err){ alert(err.message); }
  };
  
  const deleteSystemUser = (id) => { requestConfirm('Excluir Acesso', 'Tem certeza que deseja excluir este acesso permanentemente?', () => { fetch(`http://localhost:8080/api/users/${id}`, { method: 'DELETE', headers: getAuthHeaders() }).then(() => { fetchAdminData(); registerLog('DELETE', 'Segurança', `Deletou o usuário ID ${id}`); }); }, true, 'Excluir'); };

  return (
    <div className="min-h-screen bg-[#0a0a0f] font-sans selection:bg-brandGreen selection:text-white pb-32">
      {!currentUser ? (
        <div className="fixed inset-0 z-[100] bg-[#0a0a0f] flex items-center justify-center p-4">
          <div className="bg-gray-900/80 p-8 rounded-3xl border border-gray-800 w-full max-w-md shadow-2xl backdrop-blur-xl">
            <div className="text-center mb-8">
              <ShieldCheck className="text-brandGreen w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <h1 className="text-2xl font-bold text-white tracking-wider">PSI Energy <span className="text-brandGreen">GovTI</span></h1>
              <p className="text-gray-400 mt-2 text-sm">Governança, FinOps e Gestão de Ativos</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" placeholder="E-mail Corporativo"/>
              <input type="password" required value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" placeholder="••••••••"/>
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all">Entrar no Sistema</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <nav className="border-b border-gray-800 bg-black/90 backdrop-blur-md p-4 sticky top-0 z-30">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="text-brandGreen w-8 h-8" />
                <span className="text-xl font-bold text-white">PSI Energy <span className="text-brandGreen">GovTI</span></span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="text-white font-bold text-sm">{currentUser.nome}</p>
                  <p className="text-brandGreen text-xs">{currentUser.cargo}</p>
                </div>
                <button onClick={handleLogout} className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-xl"><PowerOff className="w-5 h-5"/></button>
              </div>
            </div>
          </nav>
          
          <div className="border-b border-gray-800/60 bg-gray-900/30 backdrop-blur-xl sticky top-[73px] z-20 py-4 shadow-sm">
            <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-3 px-4">
              {hasAccess('dashboard', 'read') && <button onClick={() => setActiveTab('dashboard')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'dashboard' ? 'bg-brandGreen/10 border-brandGreen/50 text-brandGreen' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><LayoutDashboard className="w-4 h-4"/> Dashboard</button>}
              {hasAccess('inventory', 'read') && <button onClick={() => setActiveTab('inventory')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'inventory' ? 'bg-brandGreen/10 border-brandGreen/50 text-brandGreen' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><Database className="w-4 h-4"/> Inventário</button>}
              {hasAccess('employees', 'read') && <button onClick={() => setActiveTab('employees')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'employees' ? 'bg-brandGreen/10 border-brandGreen/50 text-brandGreen' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><Users className="w-4 h-4"/> Colaboradores</button>}
              {hasAccess('contracts', 'read') && <button onClick={() => setActiveTab('contracts')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'contracts' ? 'bg-brandGreen/10 border-brandGreen/50 text-brandGreen' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><FileSignature className="w-4 h-4"/> Contratos</button>}
              {hasAccess('catalog', 'read') && <button onClick={() => setActiveTab('catalog')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'catalog' ? 'bg-brandGreen/10 border-brandGreen/50 text-brandGreen' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><Tag className="w-4 h-4"/> Catálogo Preços</button>}
              {hasAccess('licenses', 'read') && <button onClick={() => setActiveTab('licenses')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'licenses' ? 'bg-brandGreen/10 border-brandGreen/50 text-brandGreen' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><CreditCard className="w-4 h-4"/> Licenças</button>}
              {hasAccess('maintenance', 'read') && <button onClick={() => setActiveTab('maintenance')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'maintenance' ? 'bg-brandGreen/10 border-brandGreen/50 text-brandGreen' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><Wrench className="w-4 h-4"/> Manutenção</button>}
              {hasAccess('offboarding', 'read') && <button onClick={() => setActiveTab('offboarding')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'offboarding' ? 'bg-red-900/20 border-red-500/50 text-red-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><FileCheck className="w-4 h-4"/> Revogação</button>}
              
              {(hasAccess('export', 'read') || hasAccess('import', 'read') || hasAccess('admin', 'read')) && <div className="hidden lg:block border-l border-gray-700/50 mx-1"></div>}
              
              {hasAccess('import', 'read') && <button onClick={() => setActiveTab('import')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'import' ? 'bg-blue-900/20 border-blue-500/50 text-blue-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><UploadCloud className="w-4 h-4"/> Importar</button>}
              {hasAccess('export', 'read') && <button onClick={() => setActiveTab('export')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'export' ? 'bg-purple-900/20 border-purple-500/50 text-purple-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><DownloadCloud className="w-4 h-4"/> Exportar</button>}
              {hasAccess('admin', 'read') && <button onClick={() => setActiveTab('admin')} className={`text-sm font-semibold flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${activeTab === 'admin' ? 'bg-gray-800 border-gray-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white border-transparent'}`}><Shield className="w-4 h-4"/> Segurança</button>}
            </div>
          </div>

          <main className="max-w-7xl mx-auto p-6 mt-4">
            {activeTab === 'dashboard' && hasAccess('dashboard', 'read') && <DashboardModule assets={assets} employees={employees} licenses={licenses} contracts={contracts} catalogItems={catalogItems} formatCurrency={formatCurrency} isLoading={isLoading} />}
            {activeTab === 'admin' && hasAccess('admin', 'read') && <AdminModule hasAccess={hasAccess} systemUsers={systemUsers} auditLogs={auditLogs} deleteSystemUser={deleteSystemUser} setNewUser={setNewUser} setIsUserModalOpen={setIsUserModalOpen} roleTemplates={roleTemplates} />}
            {activeTab === 'inventory' && hasAccess('inventory', 'read') && <InventoryModule assets={assets} catalogItems={catalogItems} employees={employees} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} isLoading={isLoading} />}
            {activeTab === 'employees' && hasAccess('employees', 'read') && <EmployeesModule employees={employees} assets={assets} licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} isLoading={isLoading} />}
            {activeTab === 'maintenance' && hasAccess('maintenance', 'read') && <MaintenanceModule assets={assets} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} />}
            {activeTab === 'catalog' && hasAccess('catalog', 'read') && <CatalogModule catalogItems={catalogItems} assets={assets} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} formatCurrency={formatCurrency} isLoading={isLoading} />}            
            {activeTab === 'contracts' && hasAccess('contracts', 'read') && <ContractsModule contracts={contracts} catalogItems={catalogItems} hasAccess={hasAccess} fetchData={fetchData} formatCurrency={formatCurrency} requestConfirm={requestConfirm} registerLog={registerLog} />}
            
            {activeTab === 'licenses' && hasAccess('licenses', 'read') && <LicensesModule licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} registerLog={registerLog} formatCurrency={formatCurrency} />}
            
            {activeTab === 'import' && hasAccess('import', 'read') && <ImportModule hasAccess={hasAccess} employees={employees} contracts={contracts} licenses={licenses} requestConfirm={requestConfirm} registerLog={registerLog} fetchData={fetchData} isLoading={isLoading} />}
            {activeTab === 'export' && hasAccess('export', 'read') && <ExportModule assets={assets} employees={employees} licenses={licenses} contracts={contracts} registerLog={registerLog} isLoading={isLoading} />}
          </main>

          {/* MODAIS GLOBAIS (Avisos e Segurança) */}
          {confirmDialog.isOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[110] animate-fade-in">
              <div className={`bg-gray-900 border ${confirmDialog.isDanger ? 'border-red-900/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-gray-700 shadow-2xl'} rounded-3xl p-6 w-full max-w-md`}>
                <div className="flex justify-between items-center mb-4">
                  <h2 className={`text-xl font-bold flex items-center gap-2 ${confirmDialog.isDanger ? 'text-red-500' : 'text-white'}`}>
                    {confirmDialog.isDanger ? <AlertTriangle className="w-6 h-6"/> : <Info className="w-6 h-6 text-brandGreen"/>} {confirmDialog.title}
                  </h2>
                  <button onClick={() => setConfirmDialog(prev => ({...prev, isOpen: false}))} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <p className="text-gray-300 mb-6">{confirmDialog.message}</p>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmDialog(prev => ({...prev, isOpen: false}))} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold">Cancelar</button>
                  <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(prev => ({...prev, isOpen: false})); }} className={`flex-1 py-3 rounded-xl font-bold ${confirmDialog.isDanger ? 'bg-red-600 text-white' : 'bg-brandGreen text-white'}`}>{confirmDialog.confirmText}</button>
                </div>
              </div>
            </div>
          )}

          {isUserModalOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><KeyRound className="w-6 h-6 text-brandGreen"/> Conceder Acesso</h2>
                  <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
                </div>
                <form onSubmit={handleCreateSystemUser} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" required placeholder="Nome" value={newUser.nome} onChange={(e) => setNewUser({...newUser, nome: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
                    <input type="email" required placeholder="E-mail" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="password" required placeholder="Senha" value={newUser.senha} onChange={(e) => setNewUser({...newUser, senha: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
                    <select required value={newUser.cargo} onChange={(e) => handleRoleChange(e.target.value)} className="w-full bg-black/50 border border-brandGreen/50 rounded-xl p-3 text-brandGreen font-bold outline-none cursor-pointer">
                      {Object.keys(roleTemplates).map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                  <button type="submit" className="w-full bg-brandGreen text-white py-4 rounded-full font-bold mt-4 shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all hover:-translate-y-1">Criar Usuário</button>
                </form>
              </div>
            </div>
          )}

        </>
      )}
    </div>
  );
}