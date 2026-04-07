import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { ShieldCheck, X, LayoutDashboard, Database, CreditCard, UploadCloud, DownloadCloud, FileSignature, PowerOff, Shield, KeyRound, Tag, AlertTriangle, Info, Users, Wrench, FileCheck, Loader2, Menu, ChevronLeft } from 'lucide-react';
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
const SettingsModule = React.lazy(() => import('./modules/SettingsModule'));

// 🍞 CONFIGURAÇÃO GLOBAL DO TOAST (Pop-ups de notificação)
export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3500,
  timerProgressBar: true,
  background: '#1f2937', // Fundo escuro
  color: '#ffffff',
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export default function App() {
  // ⚡ LAZY INITIALIZATION
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem('logged_user');
    const token = localStorage.getItem('token');
    return (savedUser && token) ? JSON.parse(savedUser) : null;
  });
  
  const [loginForm, setLoginForm] = useState({ email: '', senha: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // 🍔 Estado do Menu Lateral
  
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [licenses, setLicenses] = useState([]);
  const [contracts, setContracts] = useState([]); 
  const [catalogItems, setCatalogItems] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [accessProfiles, setAccessProfiles] = useState([]);

  const [uiSettings, setUiSettings] = useState(() => {
    try {
      const raw = localStorage.getItem('ui_settings');
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        inventoryPageSize: Number(parsed.inventoryPageSize || 50),
      };
    } catch {
      return { inventoryPageSize: 50 };
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: false, confirmText: 'Confirmar' });

  // ─── FUNÇÕES CORE ───

  function requestConfirm(title, message, onConfirm, isDanger = false, confirmText = 'Confirmar') {
    setConfirmDialog({ isOpen: true, title, message, onConfirm, isDanger, confirmText });
  }

  const handleLogout = useCallback(() => { 
    const userName = currentUser ? currentUser.nome : 'Sistema';
    api.post('/audit-logs', { user: userName, action: 'LOGOUT', module: 'Autenticação', details: 'Saiu do sistema.' }).catch(() => {});
    
    localStorage.clear(); 
    setCurrentUser(null); 
    setLoginForm({ email: '', senha: '' }); 
    
    Toast.fire({ icon: 'info', title: 'Sessão encerrada com segurança.' });
  }, [currentUser]);

  const fetchAdminData = useCallback(async () => {
    try {
      const [usersRes, logsRes, profilesRes] = await Promise.all([
          api.get('/users'),
          api.get('/audit-logs'),
          api.get('/profiles')
      ]);

      const rawUsers = usersRes.data.data || usersRes.data || [];
      const rawLogs = logsRes.data.data || logsRes.data || [];
      const rawProfiles = profilesRes.data.data || profilesRes.data || [];

      const mappedProfiles = (Array.isArray(rawProfiles) ? rawProfiles : []).map((p) => ({
        ...p,
        permissions: p.permissions || (p.permissionsJSON ? (typeof p.permissionsJSON === 'string' ? JSON.parse(p.permissionsJSON) : p.permissionsJSON) : {}),
      }));

      const profById = Object.fromEntries(mappedProfiles.map((p) => [p.id, p]));

      const usersFromDB = rawUsers.map((u) => {
        let permissions = {};
        if (u.profile_id && profById[u.profile_id]) {
          const pj = profById[u.profile_id].permissionsJSON;
          permissions = pj ? (typeof pj === 'string' ? JSON.parse(pj) : pj) : {};
        } else {
          const raw = u.permissions_json || u.permissionsJSON;
          permissions = raw
            ? (typeof raw === 'string' ? JSON.parse(raw) : raw)
            : (roleTemplates[u.cargo] || {});
        }
        return {
          ...u,
          permissions,
          profileNome: u.profile_id ? profById[u.profile_id]?.nome : null,
        };
      });

      setSystemUsers(usersFromDB);
      setAuditLogs(rawLogs);
      setAccessProfiles(mappedProfiles);
      
    } catch (e) {
      console.error("❌ ERRO NO FETCH ADMIN DATA:", e);
      if(e.response?.status === 401) {
          handleLogout();
      }
    }
  }, [handleLogout]);

  const registerLog = useCallback(async (action, module, details) => {
    const logEntry = { user: currentUser ? currentUser.nome : 'Sistema', action, module, details };
    try {
      await api.post('/audit-logs', logEntry);
      if (currentUser?.cargo === 'Administrator' && (activeTab === 'admin' || activeTab === 'settings')) fetchAdminData();
    } catch (e) {
      if(e.response?.status === 401) handleLogout();
    }
  }, [currentUser, activeTab, fetchAdminData, handleLogout]);

  const fetchData = useCallback((isInitialLoad = false) => {
    setIsLoading(true);
    const requests = [];

    if (['dashboard', 'export', 'import'].includes(activeTab)) {
        requests.push(api.get('/assets').then(res => setAssets(res.data.data || [])));
        requests.push(api.get('/employees').then(res => setEmployees(res.data.data || [])));
        requests.push(api.get('/licenses').then(res => setLicenses(res.data.data || [])));
        requests.push(api.get('/contracts').then(res => setContracts(res.data.data || [])));
        requests.push(api.get('/catalog').then(res => setCatalogItems(res.data.data || [])));
    } 
    else if (['inventory', 'maintenance'].includes(activeTab)) {
        requests.push(api.get('/assets').then(res => setAssets(res.data.data || [])));
        requests.push(api.get('/employees').then(res => setEmployees(res.data.data || [])));
        requests.push(api.get('/catalog').then(res => setCatalogItems(res.data.data || [])));
    } 
    else if (['employees', 'offboarding'].includes(activeTab)) {
        requests.push(api.get('/employees').then(res => setEmployees(res.data.data || [])));
        requests.push(api.get('/assets').then(res => setAssets(res.data.data || [])));
        requests.push(api.get('/licenses').then(res => setLicenses(res.data.data || [])));
    } 
    else if (activeTab === 'contracts') {
        requests.push(api.get('/contracts').then(res => setContracts(res.data.data || [])));
    } 
    else if (activeTab === 'licenses') {
        requests.push(api.get('/licenses').then(res => setLicenses(res.data.data || [])));
    } 
    else if (activeTab === 'catalog') {
        requests.push(api.get('/catalog').then(res => setCatalogItems(res.data.data || [])));
        requests.push(api.get('/assets').then(res => setAssets(res.data.data || [])));
    }

    Promise.all(requests)
      .then(() => {
        if (isInitialLoad) {
          Toast.fire({ icon: 'success', title: 'Dados sincronizados com sucesso!' });
        }
      })
      .catch(err => {
        if (err.response?.status === 401) handleLogout();
      })
      .finally(() => setIsLoading(false));
  }, [activeTab, handleLogout]);

  // ─── EFFECTS ───

  useEffect(() => { 
    if (currentUser) { 
      // Passa true apenas se for a primeira carga ou mudança brusca para dar o feedback
      fetchData(true); 
      if (currentUser.cargo === 'Administrator' && (activeTab === 'admin' || activeTab === 'settings')) fetchAdminData(); 
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
      const res = await api.post('/login', loginForm);
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
      
      // Entra no sistema de forma suave e mostra o aviso
      setActiveTab('dashboard');
      Toast.fire({ icon: 'success', title: `Bem-vindo(a), ${loggedUser.nome.split(' ')[0]}!` });

    } catch (err) {
      console.error("Erro completo:", err);
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

  const deleteSystemUser = (id) => { 
    requestConfirm('Excluir Acesso', 'Tem certeza que deseja excluir este acesso permanentemente?', async () => { 
      try {
        await api.delete(`/users/${id}`);
        fetchAdminData(); 
        registerLog('DELETE', 'Segurança', `Deletou o usuário ID ${id}`); 
        
        Toast.fire({ icon: 'success', title: 'Acesso revogado com sucesso.' });
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

  // 🍔 COMPONENTE AUXILIAR: Botão do Menu Lateral
  const MenuItem = ({ id, icon: Icon, label, isDanger, hasDivider }) => {
    if (!hasAccess(id, 'read')) return null;
    return (
      <>
        {hasDivider && <div className="border-t border-gray-800 my-2 mx-3"></div>}
        <button
          onClick={() => setActiveTab(id)}
          title={!isSidebarOpen ? label : ''} 
          className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 overflow-hidden ${
            activeTab === id
              ? isDanger
                ? 'bg-red-900/20 text-red-500 border border-red-500/30 shadow-sm'
                : 'bg-brandGreen/10 text-brandGreen border border-brandGreen/30 shadow-sm'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent'
          }`}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          {isSidebarOpen && <span className="text-sm font-semibold whitespace-nowrap">{label}</span>}
        </button>
      </>
    );
  };

  return (
    <div className="flex h-screen bg-[#0a0a0f] font-sans selection:bg-brandGreen selection:text-white overflow-hidden">
      {!currentUser ? (
        // --- TELA DE LOGIN ---
        <div className="w-full flex items-center justify-center p-4">
          <div className="bg-gray-900/80 p-8 rounded-3xl border border-gray-800 w-full max-w-md shadow-2xl backdrop-blur-xl animate-fade-in">
            <div className="text-center mb-8">
              <ShieldCheck className="text-brandGreen w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
              <h1 className="text-2xl font-bold text-white tracking-wider">PSI Energy <span className="text-brandGreen">GovTI</span></h1>
              <p className="text-gray-400 mt-2 text-sm">Governança, FinOps e Gestão de Ativos</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" required value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" placeholder="E-mail Corporativo"/>
              <input type="password" required value={loginForm.senha} onChange={e => setLoginForm({...loginForm, senha: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" placeholder="••••••••"/>
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all">Entrar no Sistema</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* 🍔 MENU LATERAL (SIDEBAR) */}
          <aside className={`flex-shrink-0 h-screen bg-black border-r border-gray-800 transition-all duration-300 flex flex-col z-40 ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
            <div className="h-16 flex items-center justify-center border-b border-gray-800 px-4">
              <ShieldCheck className="text-brandGreen w-8 h-8 flex-shrink-0" />
              {isSidebarOpen && <span className="ml-3 text-lg font-bold text-white whitespace-nowrap overflow-hidden animate-fade-in">PSI Energy</span>}
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1.5 px-3 custom-scrollbar">
              <MenuItem id="dashboard" icon={LayoutDashboard} label="Dashboard" />
              <MenuItem id="inventory" icon={Database} label="Inventário" />
              <MenuItem id="employees" icon={Users} label="Colaboradores" />
              <MenuItem id="contracts" icon={FileSignature} label="Contratos" />
              <MenuItem id="catalog" icon={Tag} label="Catálogo de Preços" />
              <MenuItem id="licenses" icon={CreditCard} label="Licenças" />
              <MenuItem id="maintenance" icon={Wrench} label="Manutenção" />
              <MenuItem id="offboarding" icon={FileCheck} label="Revogação" isDanger />
              
              <MenuItem id="import" icon={UploadCloud} label="Importar Dados" hasDivider />
              <MenuItem id="export" icon={DownloadCloud} label="Exportar Relatórios" />
              <MenuItem id="admin" icon={Shield} label="Segurança Corporativa" />
              <MenuItem id="settings" icon={KeyRound} label="Configurações" />
            </div>

            <div className="p-4 border-t border-gray-800">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="w-full flex items-center justify-center p-3 rounded-xl bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors shadow-sm">
                {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </aside>

          {/* 🖥️ ÁREA CENTRAL (TOPBAR + MAIN CONTENT) */}
          <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
            
            {/* CABEÇALHO SUPERIOR */}
            <header className="h-16 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 flex-shrink-0 z-30">
              <div className="flex items-center gap-4">
                <h1 className="text-lg font-bold text-white capitalize hidden sm:block">
                  {activeTab === 'admin'
                    ? 'Segurança Corporativa'
                    : activeTab === 'settings'
                      ? 'Configurações'
                      : activeTab.replace('-', ' ')}
                </h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="text-white font-bold text-sm leading-tight">{currentUser.nome}</p>
                  <p className="text-brandGreen text-[11px] uppercase tracking-wider font-bold">{currentUser.cargo}</p>
                </div>
                <button onClick={handleLogout} className="bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-400 p-2.5 rounded-xl transition-colors border border-transparent hover:border-red-500/30">
                  <PowerOff className="w-5 h-5"/>
                </button>
              </div>
            </header>

            {/* ÁREA DE CONTEÚDO ROLÁVEL */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar pb-32">
              <div className="max-w-7xl mx-auto">
                <Suspense fallback={<FallbackLoader />}>
                  {activeTab === 'dashboard' && hasAccess('dashboard', 'read') && <DashboardModule assets={assets} employees={employees} licenses={licenses} contracts={contracts} catalogItems={catalogItems} formatCurrency={formatCurrency} isLoading={isLoading} />}
                  {activeTab === 'admin' && hasAccess('admin', 'read') && (
                    <AdminModule
                      hasAccess={hasAccess}
                      systemUsers={systemUsers}
                      auditLogs={auditLogs}
                      onGoToSettings={() => setActiveTab('settings')}
                    />
                  )}
                  {activeTab === 'inventory' && hasAccess('inventory', 'read') && (
                    <InventoryModule
                      assets={assets}
                      catalogItems={catalogItems}
                      employees={employees}
                      hasAccess={hasAccess}
                      fetchData={fetchData}
                      requestConfirm={requestConfirm}
                      registerLog={registerLog}
                      isLoading={isLoading}
                      pageSize={uiSettings.inventoryPageSize}
                    />
                  )}
                  {activeTab === 'employees' && hasAccess('employees', 'read') && <EmployeesModule employees={employees} assets={assets} licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} isLoading={isLoading} />}
                  {activeTab === 'maintenance' && hasAccess('maintenance', 'read') && <MaintenanceModule assets={assets} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} />}
                  {activeTab === 'catalog' && hasAccess('catalog', 'read') && <CatalogModule catalogItems={catalogItems} assets={assets} hasAccess={hasAccess} fetchData={fetchData} requestConfirm={requestConfirm} registerLog={registerLog} formatCurrency={formatCurrency} isLoading={isLoading} />}            
                  {activeTab === 'contracts' && hasAccess('contracts', 'read') && <ContractsModule contracts={contracts} catalogItems={catalogItems} hasAccess={hasAccess} fetchData={fetchData} formatCurrency={formatCurrency} requestConfirm={requestConfirm} registerLog={registerLog} />}
                  {activeTab === 'licenses' && hasAccess('licenses', 'read') && <LicensesModule licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} registerLog={registerLog} formatCurrency={formatCurrency} />}
                  {activeTab === 'offboarding' && hasAccess('offboarding', 'read') && <OffboardingModule employees={employees} assets={assets} licenses={licenses} hasAccess={hasAccess} fetchData={fetchData} registerLog={registerLog} requestConfirm={requestConfirm} />}
                  {activeTab === 'import' && hasAccess('import', 'read') && <ImportModule hasAccess={hasAccess} employees={employees} contracts={contracts} licenses={licenses} assets={assets} requestConfirm={requestConfirm} registerLog={registerLog} fetchData={fetchData} isLoading={isLoading} />}
                  {activeTab === 'export' && hasAccess('export', 'read') && <ExportModule assets={assets} employees={employees} licenses={licenses} contracts={contracts} registerLog={registerLog} isLoading={isLoading} />}
                  {activeTab === 'settings' && hasAccess('settings', 'read') && (
                    <SettingsModule
                      hasAccess={hasAccess}
                      systemUsers={systemUsers}
                      accessProfiles={accessProfiles}
                      refreshAdminData={fetchAdminData}
                      registerLog={registerLog}
                      deleteSystemUser={deleteSystemUser}
                      uiSettings={uiSettings}
                      setUiSettings={(next) => {
                        setUiSettings(next);
                        try {
                          localStorage.setItem('ui_settings', JSON.stringify(next));
                        } catch {}
                      }}
                    />
                  )}
                </Suspense>
              </div>
            </main>
          </div>

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

        </>
      )}
    </div>
  );
}