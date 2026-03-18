import React from 'react';
import { Shield, UserCheck, Trash2, History } from 'lucide-react';

export default function AdminModule({ 
  hasAccess, 
  systemUsers, 
  auditLogs, 
  deleteSystemUser, 
  setNewUser, 
  setIsUserModalOpen, 
  roleTemplates 
}) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><Shield className="text-brandGreen"/> Segurança Corporativa</h2></div>
        {hasAccess('admin', 'edit') && (
          <button onClick={() => { setNewUser({ nome: '', email: '', senha: '', cargo: 'Gestor', permissions: roleTemplates['Gestor'] }); setIsUserModalOpen(true); }} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-semibold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all duration-300">
            + Novo Usuário
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl col-span-1 shadow-xl transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><UserCheck className="w-5 h-5 text-blue-400"/> Usuários do Sistema</h3>
          <div className="space-y-3">
            {systemUsers.map(user => (
              <div key={user.id} className="bg-black/50 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-gray-700 transition-colors">
                <div><p className="text-white font-bold text-sm">{user.nome}</p><p className="text-xs text-brandGreen">{user.cargo}</p></div>
                {hasAccess('admin', 'edit') && user.id !== 1 && (
                  <button onClick={() => deleteSystemUser(user.id)} className="text-gray-500 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl col-span-1 lg:col-span-2 shadow-xl flex flex-col max-h-[500px] transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><History className="w-5 h-5 text-purple-400"/> Logs de Auditoria</h3>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {auditLogs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-10 italic">Nenhum evento registrado.</p>
            ) : (
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-black/50 text-gray-400 sticky top-0"><tr><th className="px-4 py-2">Data/Hora</th><th className="px-4 py-2">Usuário</th><th className="px-4 py-2">Módulo</th><th className="px-4 py-2">Ação</th></tr></thead>
                <tbody className="divide-y divide-gray-800">
                  {auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-800/80 transition-all duration-200">
                      <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 font-semibold text-brandGreen">{log.user}</td>
                      <td className="px-4 py-3 text-xs"><span className="bg-gray-800/80 px-2 py-1 rounded border border-gray-700">{log.module}</span></td>
                      <td className="px-4 py-3 text-xs">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}