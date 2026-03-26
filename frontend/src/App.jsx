import React, { useState, useEffect, Suspense } from 'react';
import { ShieldCheck, X, LayoutDashboard, Database, CreditCard, UploadCloud, DownloadCloud, FileSignature, PowerOff, Shield, KeyRound, Tag, AlertTriangle, Info, Users, Wrench, FileCheck, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';

import { roleTemplates } from './constants/permissions';
import { formatCurrency } from './utils/helpers'; 
import api from './services/api';

// 🚨 COMPONENTES COM CODE SPLITTING
const DashboardModule = React.lazy(() => import('./modules/DashboardModule'));
const AdminModule = React.lazy(() => import('./modules/AdminModule'));
const InventoryModule = React.lazy(() => import('./modules/InventoryModule'));
const EmployeesModule = React.lazy(() => import('./modules/EmployeesModule'));
const MaintenanceModule = React.lazy(() => import('./modules/MaintenanceModule'));
const ImportModule = React.lazy(() => import('./modules/ImportModule'));
const ExportModule = React.lazy(() => import('./modules/ExportModule'));
const LicensesModule = React.lazy(() => import('./modules/LicensesModule'));
const ContractsModule = React.lazy(() => import('./modules/ContractsModule'));
const CatalogModule = React.lazy(() => import('./modules/CatalogModule'));
const OffboardingModule = React.lazy(() => import('./modules/OffboardingModule')); 

export default function App() {
  // ⚡ LAZY INITIALIZATION (Performance Máxima)
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('logged_user');
    const token = localStorage.getItem('token');
    return (savedUser && token) ? JSON.parse(savedUser) : null;
  });
  
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
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

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({ nome: '', email: '', senha: '', cargo: 'Gestor' });

  // ─── FUNÇÕES CORE (Hoisting Garantido) ───

  function requestConfirm(title, message, onConfirm, isDanger = false, confirmText = 'Confirmar') {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, isDanger, confirmText });
  }

  function handleLogout() { 
    const userName = currentUser ? currentUser.nome : 'Sistema';
    api.post('/api/audit-logs', { user: userName, action: 'LOGOUT', module: 'Autenticação', details: 'Saiu do sistema.' }).catch(() => {});
    
    localStorage.clear(); 
    setCurrentUser(null); 
    setLoginForm({ email: '', senha: '' }); 
  }

  async function fetchAdminData() {
    try {
      const [usersRes, logsRes] = await Promise.all([
          api.get('/api/users'),
          api.get('/api/audit-logs')
      ]);
      const usersFromDB = (usersRes.data.data || []).map(u => ({ ...u, permissions: u.permissions_json ? JSON.parse(u.permissions_json) : (roleTemplates[u.cargo] || {}) }));
      setSystemUsers(usersFromDB);
      setAuditLogs(logsRes.data.data || []);
    } catch (e) {
      if(e.response?.status === 401) handleLogout();
    }
  }

  async function registerLog(action, module, details) {
    const logEntry = { user: currentUser ? currentUser.nome : 'Sistema', action, module, details };
    try {
      await api.post('/api/audit-logs', logEntry);
      if (currentUser?.cargo === 'Administrator' && activeTab === 'admin') fetchAdminData();
    } catch (e) {
      if(e.response?.status === 401) handleLogout();
    }
  }

  function fetchData() {
    setIsLoading(true);
    const requests = [];

    if (['dashboard', 'export', 'import'].includes(activeTab)) {
        requests.push(api.get('/api/assets').then(res => setAssets(res.data.data || [])));
        requests.push(api.get('/api/employees').then(res => setEmployees(res.data.data || [])));
        requests.push(api.get('/api/licenses').then(res => setLicenses(res.data.data || [])));
        requests.push(api.get('/api/contracts').then(res => setContracts(res.data.data || [])));
        requests.push(api.get('/api/catalog').then(res => setCatalogItems(res.data.data || [])));
    } 
    else if (['inventory', 'maintenance'].includes(activeTab)) {
        requests.push(api.get('/api/assets').then(res => setAssets(res.data.data || [])));
        requests.push(api.get('/api/employees').then(res => setEmployees(res.data.data || [])));
        requests.push(api.get('/api/catalog').then(res => setCatalogItems(res.data.data || [])));
    } 
    else if (['employees', 'offboarding'].includes(activeTab)) {
        requests.push(api.get('/api/employees').then(res => setEmployees(res.data.data || [])));
        requests.push(api.get('/api/assets').then(res => setAssets(res.data.data || [])));
        requests.push(api.get('/api/licenses').then(res => setLicenses(res.data.data || [])));
    } 
    else if (activeTab === 'contracts') {
        requests.push(api.get('/api/contracts').then(res => setContracts(res.data.data || [])));
    } 
    else if (activeTab === 'licenses') {
        requests.push(api.get('/api/licenses').then(res => setLicenses(res.data.data || [])));
    } 
    else if (activeTab === 'catalog') {
        requests.push(api.get('/api/catalog').then(res => setCatalogItems(res.data.data || [])));
        requests.push(api.get('/api/assets').then(res => setAssets(res.data.data || [])));
    }

    Promise.all(requests)
      .catch(err => {
        if (err.response?.status === 401) handleLogout();
      })
      .finally(() => setIsLoading(false));
  }

  // ─── EFFECTS ───

  useEffect(() => { 
    if (currentUser) { 
      fetchData(); 
      if (currentUser.cargo === 'Administrator' && activeTab === 'admin') fetchAdminData(); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, activeTab]);

  const handleLogin = async (e) => {
    e.preventDefault(); 
    Swal.fire({
      title: 'Autenticando...',
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); }
    });

    try {
      const res = await api.post('/api/login', loginForm);
      const data = res.data;
      
      const loggedUser = data.data;
      const rawPerms = loggedUser.permissions_json || loggedUser.permissionsJSON;
      loggedUser.permissions = rawPerms 
        ? (typeof rawPerms === 'string' ? JSON.parse(rawPerms) : rawPerms) 
        : (roleTemplates[loggedUser.cargo] || {});

      localStorage.setItem('token', data.token);
      localStorage.setItem('logged_user', JSON.stringify(loggedUser));
      
      Swal.close();
      setCurrentUser(loggedUser);
    } catch (err) {
      Swal.fire({
        title: 'Erro no Login',
        text: err.response?.data?.error || "E-mail ou senha incorretos.",
        icon: 'error',
        background: '#1f2937',
        color: '#ffffff',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const hasAccess = (module, requiredLevel = 'read') => { 
    if (!currentUser) return false; 
    if (currentUser.cargo === 'Administrator') return true; 
    const perm = currentUser.permissions?.[module]; 
    if (!perm || perm === 'none') return false; 
    if (requiredLevel === 'read') return perm === 'read' || perm === 'edit'; 
    if (requiredLevel === 'edit') return perm === 'edit'; 
    return false; 
  };

  const handleRoleChange = (cargo) => {
    setNewUser({ ...newUser, cargo: cargo, permissions: { ...roleTemplates[cargo] } });
  };
  
  const handleCreateSystemUser = async (e) => { 
    e.preventDefault(); 
    const payload = { ...newUser, permissions_json: JSON.stringify(newUser.permissions) }; 
    try {
      await api.post('/api/users', payload);
      setIsUserModalOpen(false); 
      fetchAdminData(); 
      registerLog('CREATE', 'Segurança', `Criou usuário ${newUser.nome}`); 
    } catch(err){ 
      Swal.fire('Erro', err.response?.data?.error || err.message, 'error');
    }
  };
  
  const deleteSystemUser = (id) => { 
    requestConfirm('Excluir Acesso', 'Tem certeza que deseja excluir este acesso permanentemente?', async () => { 
      try {
        await api.delete(`/api/users/${id}`);
        fetchAdminData(); 
        registerLog('DELETE', 'Segurança', `Deletou o usuário ID ${id}`); 
      } catch(err) { 
        Swal.fire('Erro', err.response?.data?.error || err.message, 'error');
      }
    }, true, 'Excluir'); 
  };

  const FallbackLoader = () => (
    <div className="flex flex-col items-center justify-center py-32">
      <Loader2 className="w-12 h-12 text-brandGreen animate-spin mb-4" />
      <p className="text-gray-400 font-bold animate-pulse">Carregando módulo...</p>
    </div>
  );

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
            <Suspense fallback={<FallbackLoader />}>
              {activeTab === 'dashboard' && hasAccess('dashboard', 'read') && <DashboardModule assets={assets} employees={employees} licenses={licenses} contracts={contracts} catalogItems={catalogItems} formatCurrency={formatCurrency} isLoading={isLoading} />}
              {activeTab === 'admin' && hasAccess('admin', 'read') && <AdminModule hasAccess={hasAccess} systemUsers={systemUsers} auditLogs={auditLogs} deleteSystemUser={deleteSystemUser} setNewUser={setNewUser} setIsUserModalOpen={setIsUserModalOpen} roleTemplates={roleTemplates} />}
              {activeTab === 'inventory' && hasAccess('inventory', 'read') && <InventoryModule assets={assets} catalogItems={catalogItems} employees={employees} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} isLoading={isLoading} />}
              {activeTab === 'employees' && hasAccess('employees', 'read') && <EmployeesModule employees={employees} assets={assets} licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} isLoading={isLoading} />}
              {activeTab === 'maintenance' && hasAccess('maintenance', 'read') && <MaintenanceModule assets={assets} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} />}
              {activeTab === 'catalog' && hasAccess('catalog', 'read') && <CatalogModule catalogItems={catalogItems} assets={assets} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} formatCurrency={formatCurrency} isLoading={isLoading} />}            
              {activeTab === 'contracts' && hasAccess('contracts', 'read') && <ContractsModule contracts={contracts} catalogItems={catalogItems} hasAccess={hasAccess} fetchData={fetchData} formatCurrency={formatCurrency} requestConfirm={requestConfirm} registerLog={registerLog} />}
              {activeTab === 'licenses' && hasAccess('licenses', 'read') && <LicensesModule licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} registerLog={registerLog} formatCurrency={formatCurrency} />}
              {activeTab === 'offboarding' && hasAccess('offboarding', 'read') && <OffboardingModule employees={employees} assets={assets} licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} registerLog={registerLog} requestConfirm={requestConfirm} />}
              {activeTab === 'import' && hasAccess('import', 'read') && <ImportModule hasAccess={hasAccess} employees={employees} contracts={contracts} licenses={licenses} assets={assets} requestConfirm={requestConfirm} registerLog={registerLog} fetchData={fetchData} isLoading={isLoading} />}
              {activeTab === 'export' && hasAccess('export', 'read') && <ExportModule assets={assets} employees={employees} licenses={licenses} contracts={contracts} registerLog={registerLog} isLoading={isLoading} />}
            </Suspense>
          </main>

          {/* MODAIS GLOBAIS */}
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