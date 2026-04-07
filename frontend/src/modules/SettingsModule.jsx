import React, { useMemo, useState } from 'react';
import { KeyRound, Plus, Search, X, Trash2, Edit2, Save, Settings2, UserPlus } from 'lucide-react';
import api from '../services/api';

const MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'inventory', label: 'Inventário' },
  { id: 'employees', label: 'Colaboradores' },
  { id: 'contracts', label: 'Contratos' },
  { id: 'catalog', label: 'Catálogo' },
  { id: 'licenses', label: 'Licenças' },
  { id: 'maintenance', label: 'Manutenção' },
  { id: 'offboarding', label: 'Revogação' },
  { id: 'import', label: 'Importação' },
  { id: 'export', label: 'Exportação' },
  { id: 'admin', label: 'Segurança' },
  { id: 'settings', label: 'Configurações' },
];

function emptyPerms() {
  const out = {};
  MODULES.forEach((m) => {
    out[m.id] = 'none';
  });
  return out;
}

function countPerms(perms, level) {
  const p = perms || {};
  return Object.values(p).filter((v) => v === level).length;
}

function paginate(list, page, pageSize) {
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const cur = Math.min(Math.max(1, page), pages);
  const start = (cur - 1) * pageSize;
  return { total, pages, cur, items: list.slice(start, start + pageSize) };
}

export default function SettingsModule({
  hasAccess,
  systemUsers = [],
  accessProfiles = [],
  refreshAdminData,
  registerLog,
  deleteSystemUser,
  uiSettings,
  setUiSettings,
}) {
  const [activeSub, setActiveSub] = useState('profiles');

  // Perfis
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ nome: '', permissions: emptyPerms() });

  const safeProfiles = Array.isArray(accessProfiles) ? accessProfiles : [];

  const filteredProfiles = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return safeProfiles;
    return safeProfiles.filter((p) => String(p.nome || '').toLowerCase().includes(term));
  }, [q, safeProfiles]);

  const pg = useMemo(() => paginate(filteredProfiles, page, pageSize), [filteredProfiles, page, pageSize]);

  const openNewProfile = () => {
    setEditingProfile(null);
    setProfileForm({ nome: '', permissions: emptyPerms() });
    setIsProfileModalOpen(true);
  };

  const openEditProfile = (p) => {
    setEditingProfile(p);
    setProfileForm({
      nome: p.nome || '',
      permissions: { ...emptyPerms(), ...(p.permissions || (p.permissionsJSON ? JSON.parse(p.permissionsJSON) : {})) },
    });
    setIsProfileModalOpen(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    if (!hasAccess('settings', 'edit')) return;
    try {
      if (editingProfile?.id) {
        await api.put(`/api/profiles/${editingProfile.id}`, {
          nome: profileForm.nome,
          permissions: profileForm.permissions,
        });
        registerLog?.('UPDATE', 'Configurações', `Atualizou perfil ${profileForm.nome}`);
      } else {
        await api.post('/api/profiles', {
          nome: profileForm.nome,
          permissions: profileForm.permissions,
        });
        registerLog?.('CREATE', 'Configurações', `Criou perfil ${profileForm.nome}`);
      }
      setIsProfileModalOpen(false);
      await refreshAdminData?.();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Erro ao salvar perfil');
    }
  };

  // Usuários
  const [userQ, setUserQ] = useState('');
  const [uPage, setUPage] = useState(1);
  const [uPageSize, setUPageSize] = useState(10);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({ nome: '', email: '', senha: '', profile_id: '' });

  const safeUsers = Array.isArray(systemUsers) ? systemUsers : [];

  const filteredUsers = useMemo(() => {
    const term = userQ.trim().toLowerCase();
    if (!term) return safeUsers;
    return safeUsers.filter(
      (u) =>
        String(u.nome || '')
          .toLowerCase()
          .includes(term) || String(u.email || '')
          .toLowerCase()
          .includes(term)
    );
  }, [userQ, safeUsers]);

  const userPg = useMemo(() => paginate(filteredUsers, uPage, uPageSize), [filteredUsers, uPage, uPageSize]);

  const openNewUser = () => {
    setEditingUser(null);
    setUserForm({ nome: '', email: '', senha: '', profile_id: safeProfiles[0]?.id || '' });
    setIsUserModalOpen(true);
  };

  const openEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      nome: u.nome || '',
      email: u.email || '',
      senha: '',
      profile_id: u.profile_id || '',
    });
    setIsUserModalOpen(true);
  };

  const submitUser = async (e) => {
    e.preventDefault();
    if (!hasAccess('settings', 'edit')) return;
    try {
      const pid = userForm.profile_id === '' ? null : Number(userForm.profile_id);
      if (!pid) {
        alert('Selecione um perfil de acesso.');
        return;
      }
      if (!editingUser && !userForm.senha?.trim()) {
        alert('Informe uma senha para o novo usuário.');
        return;
      }
      if (editingUser) {
        const body = { nome: userForm.nome, email: userForm.email, profile_id: pid };
        if (userForm.senha?.trim()) body.senha = userForm.senha;
        await api.put(`/api/users/${editingUser.id}`, body);
        registerLog?.('UPDATE', 'Configurações', `Atualizou usuário ${userForm.email}`);
      } else {
        await api.post('/api/users', {
          nome: userForm.nome,
          email: userForm.email,
          senha: userForm.senha,
          profile_id: pid,
        });
        registerLog?.('CREATE', 'Configurações', `Criou usuário ${userForm.email}`);
      }
      setIsUserModalOpen(false);
      await refreshAdminData?.();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Erro ao salvar usuário');
    }
  };

  const removeUser = (u) => {
    if (!hasAccess('settings', 'edit')) return;
    deleteSystemUser?.(u.id);
  };

  const deleteProfile = async (p) => {
    if (!hasAccess('settings', 'edit')) return;
    if (!window.confirm(`Remover o perfil "${p.nome}"?`)) return;
    try {
      await api.delete(`/api/profiles/${p.id}`);
      registerLog?.('DELETE', 'Configurações', `Removeu perfil ${p.nome}`);
      await refreshAdminData?.();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Erro ao remover perfil');
    }
  };

  // Preferências UI
  const uiInventoryPageSize = Number(uiSettings?.inventoryPageSize || 50);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-3xl shadow-xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <KeyRound className="text-brandGreen" /> Configurações
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveSub('profiles')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                activeSub === 'profiles'
                  ? 'bg-brandGreen/10 text-brandGreen border-brandGreen/30'
                  : 'bg-black/40 text-gray-300 border-gray-700 hover:bg-gray-800'
              }`}
            >
              Perfis & Acessos
            </button>
            <button
              type="button"
              onClick={() => setActiveSub('users')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                activeSub === 'users'
                  ? 'bg-brandGreen/10 text-brandGreen border-brandGreen/30'
                  : 'bg-black/40 text-gray-300 border-gray-700 hover:bg-gray-800'
              }`}
            >
              Usuários
            </button>
            <button
              type="button"
              onClick={() => setActiveSub('ui')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                activeSub === 'ui'
                  ? 'bg-brandGreen/10 text-brandGreen border-brandGreen/30'
                  : 'bg-black/40 text-gray-300 border-gray-700 hover:bg-gray-800'
              }`}
            >
              Preferências (UI)
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Ajuste perfis com <span className="text-gray-300 font-semibold">Leitura</span>,{' '}
          <span className="text-gray-300 font-semibold">Edição</span> ou{' '}
          <span className="text-gray-300 font-semibold">Ocultar</span> por aba.
        </p>
      </div>

      {activeSub === 'profiles' && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl shadow-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 bg-black/40 border border-gray-700 rounded-full px-4 py-2.5 focus-within:border-brandGreen transition-colors w-full lg:max-w-md">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Pesquisar perfil..."
                className="bg-transparent text-white outline-none w-full text-sm"
              />
              {q && (
                <button type="button" onClick={() => setQ('')} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {hasAccess('settings', 'edit') && (
              <button
                type="button"
                onClick={openNewProfile}
                className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-3 rounded-2xl font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all hover:-translate-y-1 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> Novo Perfil
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[860px]">
              <thead className="bg-black/60 border-b border-gray-800 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 rounded-tl-3xl">Nome</th>
                  <th className="px-6 py-4">Leitura</th>
                  <th className="px-6 py-4">Edição</th>
                  <th className="px-6 py-4">Ocultos</th>
                  <th className="px-6 py-4 rounded-tr-3xl text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {pg.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500">
                      Nenhum perfil encontrado.
                    </td>
                  </tr>
                ) : (
                  pg.items.map((p) => {
                    const perms = p.permissions || (p.permissionsJSON ? JSON.parse(p.permissionsJSON) : {});
                    return (
                      <tr key={p.id} className="hover:bg-gray-800/60 transition-colors">
                        <td className="px-6 py-4 font-bold text-white">{p.nome}</td>
                        <td className="px-6 py-4">{countPerms(perms, 'read')}</td>
                        <td className="px-6 py-4">{countPerms(perms, 'edit')}</td>
                        <td className="px-6 py-4">{countPerms(perms, 'none')}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              type="button"
                              onClick={() => openEditProfile(p)}
                              className="px-3 py-2 rounded-xl border border-gray-700 bg-black/30 hover:bg-gray-800 text-gray-200 text-xs font-semibold flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" /> Editar
                            </button>
                            {hasAccess('settings', 'edit') && (
                              <button
                                type="button"
                                onClick={() => deleteProfile(p)}
                                className="px-3 py-2 rounded-xl border border-red-800/40 bg-red-900/10 hover:bg-red-900/20 text-red-200 text-xs font-semibold flex items-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Remover
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500">
              Mostrando{' '}
              <span className="text-gray-200 font-semibold">
                {pg.total === 0 ? 0 : (pg.cur - 1) * pageSize + 1}
              </span>
              –
              <span className="text-gray-200 font-semibold">
                {Math.min(pg.cur * pageSize, pg.total)}
              </span>{' '}
              de <span className="text-gray-200 font-semibold">{pg.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">Registros por página:</div>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brandGreen"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pg.cur <= 1}
                  onClick={() => setPage(1)}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={pg.cur <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  ‹
                </button>
                <div className="px-2 text-xs text-gray-400">
                  {pg.cur}/{pg.pages}
                </div>
                <button
                  type="button"
                  disabled={pg.cur >= pg.pages}
                  onClick={() => setPage((p) => Math.min(pg.pages, p + 1))}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  ›
                </button>
                <button
                  type="button"
                  disabled={pg.cur >= pg.pages}
                  onClick={() => setPage(pg.pages)}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSub === 'users' && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl shadow-xl p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">Usuários do sistema</h3>
            </div>
            {hasAccess('settings', 'edit') && (
              <button
                type="button"
                onClick={openNewUser}
                disabled={safeProfiles.length === 0}
                className="bg-brandGreen hover:bg-brandGreenHover disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-2xl font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all hover:-translate-y-1 flex items-center gap-2"
              >
                <UserPlus className="w-5 h-5" /> Novo usuário
              </button>
            )}
          </div>
          {safeProfiles.length === 0 && (
            <p className="text-sm text-amber-400 mb-4">
              Cadastre pelo menos um perfil em <span className="font-semibold">Perfis & Acessos</span> antes de criar usuários.
            </p>
          )}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            <div className="flex items-center gap-3 bg-black/40 border border-gray-700 rounded-full px-4 py-2.5 focus-within:border-brandGreen transition-colors w-full lg:max-w-md">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                value={userQ}
                onChange={(e) => {
                  setUserQ(e.target.value);
                  setUPage(1);
                }}
                placeholder="Pesquisar por nome ou e-mail..."
                className="bg-transparent text-white outline-none w-full text-sm"
              />
              {userQ && (
                <button type="button" onClick={() => setUserQ('')} className="text-gray-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300 min-w-[720px]">
              <thead className="bg-black/60 border-b border-gray-800 uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 rounded-tl-3xl">Nome</th>
                  <th className="px-6 py-4">E-mail</th>
                  <th className="px-6 py-4">Perfil</th>
                  <th className="px-6 py-4 rounded-tr-3xl text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {userPg.items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                ) : (
                  userPg.items.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-800/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{u.nome}</td>
                      <td className="px-6 py-4 text-brandGreen break-all">{u.email}</td>
                      <td className="px-6 py-4 text-gray-300">{u.profileNome || u.cargo || '—'}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditUser(u)}
                            className="px-3 py-2 rounded-xl border border-gray-700 bg-black/30 hover:bg-gray-800 text-gray-200 text-xs font-semibold flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" /> Editar
                          </button>
                          {hasAccess('settings', 'edit') && u.id !== 1 && (
                            <button
                              type="button"
                              onClick={() => removeUser(u)}
                              className="px-3 py-2 rounded-xl border border-red-800/40 bg-red-900/10 hover:bg-red-900/20 text-red-200 text-xs font-semibold flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Remover
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-gray-500">
              Mostrando{' '}
              <span className="text-gray-200 font-semibold">
                {userPg.total === 0 ? 0 : (userPg.cur - 1) * uPageSize + 1}
              </span>
              –
              <span className="text-gray-200 font-semibold">
                {Math.min(userPg.cur * uPageSize, userPg.total)}
              </span>{' '}
              de <span className="text-gray-200 font-semibold">{userPg.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500">Registros por página:</div>
              <select
                value={uPageSize}
                onChange={(e) => {
                  setUPageSize(Number(e.target.value));
                  setUPage(1);
                }}
                className="bg-black/40 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brandGreen"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={userPg.cur <= 1}
                  onClick={() => setUPage(1)}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  «
                </button>
                <button
                  type="button"
                  disabled={userPg.cur <= 1}
                  onClick={() => setUPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  ‹
                </button>
                <div className="px-2 text-xs text-gray-400">
                  {userPg.cur}/{userPg.pages}
                </div>
                <button
                  type="button"
                  disabled={userPg.cur >= userPg.pages}
                  onClick={() => setUPage((p) => Math.min(userPg.pages, p + 1))}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  ›
                </button>
                <button
                  type="button"
                  disabled={userPg.cur >= userPg.pages}
                  onClick={() => setUPage(userPg.pages)}
                  className="px-3 py-2 text-xs rounded-xl border border-gray-700 bg-black/30 text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSub === 'ui' && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-3xl shadow-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Preferências de interface</h3>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setUiSettings?.({
                ...(uiSettings || {}),
                inventoryPageSize: uiInventoryPageSize,
              });
              alert('Preferências salvas.');
            }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="bg-black/40 border border-gray-800 rounded-2xl p-5">
              <div className="text-white font-bold flex items-center gap-2">
                <Save className="w-4 h-4 text-brandGreen" /> Paginação do Inventário
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Define quantos itens serão exibidos por página no Inventário (evita lista “infinita”).
              </p>
              <div className="mt-4">
                <label className="text-xs text-gray-400 block mb-1">Itens por página</label>
                <select
                  value={uiInventoryPageSize}
                  onChange={(e) =>
                    setUiSettings?.({
                      ...(uiSettings || {}),
                      inventoryPageSize: Number(e.target.value),
                    })
                  }
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brandGreen"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-black/40 border border-gray-800 rounded-2xl p-5">
              <div className="text-white font-bold">Observação</div>
              <p className="text-xs text-gray-500 mt-2">
                Para telas muito largas (zoom alto), usamos <span className="text-gray-300 font-semibold">scroll horizontal</span> nas tabelas e removemos limitações antigas no layout para não “quebrar” o conteúdo.
              </p>
            </div>
          </form>
        </div>
      )}

      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[210] overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-brandGreen" />
                {editingUser ? 'Editar usuário' : 'Novo usuário'}
              </h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={submitUser} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome</label>
                <input
                  required
                  value={userForm.nome}
                  onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brandGreen"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  disabled={!!editingUser}
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brandGreen disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Perfil de acesso</label>
                <select
                  required
                  value={userForm.profile_id === '' ? '' : String(userForm.profile_id)}
                  onChange={(e) => setUserForm({ ...userForm, profile_id: e.target.value === '' ? '' : Number(e.target.value) })}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brandGreen"
                >
                  <option value="">Selecione...</option>
                  {safeProfiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  As permissões do usuário seguem o perfil escolhido (e atualizam quando o perfil mudar).
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Senha {editingUser && <span className="text-gray-500">(deixe em branco para manter)</span>}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.senha}
                  onChange={(e) => setUserForm({ ...userForm, senha: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brandGreen"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!hasAccess('settings', 'edit')}
                  className="flex-1 bg-brandGreen text-white py-3 rounded-xl font-bold hover:bg-brandGreenHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200] overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-3xl shadow-2xl my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingProfile ? 'Editar Perfil' : 'Novo Perfil'}
              </h2>
              <button onClick={() => setIsProfileModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome do perfil</label>
                <input
                  required
                  value={profileForm.nome}
                  onChange={(e) => setProfileForm({ ...profileForm, nome: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brandGreen"
                  placeholder="Ex: Financeiro, RH, TI..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {MODULES.map((m) => (
                  <div key={m.id} className="bg-black/40 border border-gray-800 rounded-2xl p-4">
                    <div className="text-white font-semibold">{m.label}</div>
                    <div className="mt-2">
                      <select
                        value={profileForm.permissions?.[m.id] || 'none'}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            permissions: { ...(profileForm.permissions || {}), [m.id]: e.target.value },
                          })
                        }
                        className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-brandGreen"
                      >
                        <option value="none">Ocultar</option>
                        <option value="read">Leitura</option>
                        <option value="edit">Edição</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!hasAccess('settings', 'edit')}
                  className="flex-1 bg-brandGreen text-white py-3 rounded-xl font-bold hover:bg-brandGreenHover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

