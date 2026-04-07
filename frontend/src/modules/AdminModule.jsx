import React from 'react';
import { Shield, UserCheck, History, Settings } from 'lucide-react';

export default function AdminModule({
  hasAccess,
  systemUsers = [],
  auditLogs = [],
  onGoToSettings,
}) {
  const safeUsers = Array.isArray(systemUsers) ? systemUsers : [];
  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-brandGreen" /> Segurança Corporativa
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Cadastro de usuários e perfis de acesso está em{' '}
            <span className="text-gray-300 font-semibold">Configurações</span>.
          </p>
        </div>
        {hasAccess('settings', 'read') && (
          <button
            type="button"
            onClick={() => onGoToSettings?.()}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-5 py-2.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4 text-brandGreen" /> Abrir Configurações
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl col-span-1 shadow-xl transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" /> Usuários do Sistema
          </h3>
          <div className="space-y-3">
            {safeUsers.length > 0 ? (
              safeUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-black/50 border border-gray-800 p-4 rounded-xl flex justify-between items-start hover:border-gray-700 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{user.nome}</p>
                    <p className="text-xs text-brandGreen break-all">{user.email}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Perfil:{' '}
                      <span className="text-gray-300">
                        {user.profileNome || user.cargo || '—'}
                      </span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center mt-10 italic">Nenhum usuário encontrado.</p>
            )}
          </div>
        </div>

        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl col-span-1 lg:col-span-2 shadow-xl flex flex-col max-h-[500px] transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-purple-400" /> Logs de Auditoria
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {safeLogs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-10 italic">Nenhum evento registrado.</p>
            ) : (
              <table className="w-full text-left text-sm text-gray-300 min-w-[520px]">
                <thead className="bg-black/50 text-gray-400 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 rounded-tl-xl">Data/Hora</th>
                    <th className="px-4 py-2">Usuário</th>
                    <th className="px-4 py-2">Módulo</th>
                    <th className="px-4 py-2 rounded-tr-xl">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {safeLogs.map((log) => {
                    const logDate = log.created_at || log.timestamp;
                    const dateFormatted = logDate ? new Date(logDate).toLocaleString('pt-BR') : '-';
                    const userEmail = log.user_email || log.user || 'Sistema';

                    return (
                      <tr key={log.id} className="hover:bg-gray-800/80 transition-all duration-200">
                        <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">{dateFormatted}</td>
                        <td className="px-4 py-3 font-semibold text-brandGreen">{userEmail}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className="bg-gray-800/80 px-2 py-1 rounded border border-gray-700">{log.module}</span>
                        </td>
                        <td className="px-4 py-3 text-xs">{log.details}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
