import React, { useState } from 'react';
import { CreditCard, Edit2, X, Users } from 'lucide-react';
import { getAuthHeaders, parseCurrencyToFloat } from '../utils/helpers';

export default function LicensesModule({ licenses, hasAccess, fetchData, registerLog, formatCurrency }) {
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [editLicenseData, setEditLicenseData] = useState(null);
  const [newLicense, setNewLicense] = useState({ nome: '', fornecedor: '', plano: 'Mensal', custo: '', quantidade_total: '', data_renovacao: '' });
  const [viewLicenseUsers, setViewLicenseUsers] = useState(null);
// Substitua temporariamente a linha por esta (com a URL real do seu backend):
const API_BASE_URL = 'https://paleturquoise-mallard-173694.hostingersite.com';  
const handleCreateLicense = async (e) => { 
    e.preventDefault(); 
    const payload = {...newLicense, custo: parseCurrencyToFloat(newLicense.custo), quantidade_total: parseInt(newLicense.quantidade_total)}; 
    try {
      const res = await fetch(`${API_BASE_URL}/api/licenses`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error("Erro");
      registerLog('CREATE', 'Licenças', `Cadastrou licença ${payload.nome}`); 
      setIsLicenseModalOpen(false); 
      setNewLicense({ nome: '', fornecedor: '', plano: 'Mensal', custo: '', quantidade_total: '', data_renovacao: '' }); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const handleUpdateLicense = async (e) => { 
    e.preventDefault(); 
    const payload = {...editLicenseData, custo: parseCurrencyToFloat(editLicenseData.custo), quantidade_total: parseInt(editLicenseData.quantidade_total)}; 
    try {
      const res = await fetch(`${API_BASE_URL}/api/licenses/${editLicenseData.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Licenças', `Atualizou licença ${payload.nome}`); 
      setEditLicenseData(null); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const unassignLicense = async (assignmentId) => { 
    try {
      const res = await fetch(`${API_BASE_URL}/api/licenses/unassign/${assignmentId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Licenças', `Revogou atribuição de licença ID ${assignmentId}`); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><CreditCard className="text-brandGreen"/> Gestão de FinOps & Software</h2>
        {hasAccess('licenses', 'edit') && (
          <button onClick={() => setIsLicenseModalOpen(true)} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all duration-300">
            + Nova Licença
          </button>
        )}
      </div>
      <div className="bg-gray-900/80 backdrop-blur border border-gray-800 rounded-3xl shadow-xl min-h-[400px] overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-gray-400 border-b border-gray-800">
            <tr><th className="px-6 py-4">Software</th><th className="px-6 py-4">Custo Un.</th><th className="px-6 py-4">Estoque</th><th className="px-6 py-4">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {licenses.map(lic => (
              <tr key={lic.id} className="hover:bg-gray-800/80 transition-colors duration-200">
                <td className="px-6 py-4 font-bold text-white">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-brandGreen" onClick={() => setViewLicenseUsers(lic)}>
                    {lic.nome} <span className="text-xs font-normal text-blue-400 ml-2 hover:underline">(Ver Usuários)</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-brandGreen font-mono">{formatCurrency(lic.custo)}</td>
                <td className="px-6 py-4">{lic.quantidade_em_uso}/{lic.quantidade_total}</td>
                <td className="px-6 py-4">
                  {hasAccess('licenses', 'edit') && (
                    <button onClick={() => { setEditLicenseData(lic); setIsLicenseModalOpen(true); }} className="text-blue-400 hover:text-blue-300 hover:underline transition-colors"><Edit2 className="w-4 h-4"/></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isLicenseModalOpen || editLicenseData) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Licença</h2>
              <button onClick={() => {setIsLicenseModalOpen(false); setEditLicenseData(null);}} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={editLicenseData ? handleUpdateLicense : handleCreateLicense} className="flex flex-col gap-4">
              <input type="text" required placeholder="Nome do Software" value={editLicenseData ? editLicenseData.nome : newLicense.nome} onChange={(e) => editLicenseData ? setEditLicenseData({...editLicenseData, nome: e.target.value}) : setNewLicense({...newLicense, nome: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Fornecedor" value={editLicenseData ? editLicenseData.fornecedor : newLicense.fornecedor} onChange={(e) => editLicenseData ? setEditLicenseData({...editLicenseData, fornecedor: e.target.value}) : setNewLicense({...newLicense, fornecedor: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
                <select value={editLicenseData ? editLicenseData.plano : newLicense.plano} onChange={(e) => editLicenseData ? setEditLicenseData({...editLicenseData, plano: e.target.value}) : setNewLicense({...newLicense, plano: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors cursor-pointer"><option value="Mensal">Mensal</option><option value="Anual">Anual</option></select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="number" step="0.01" required placeholder="Custo Un." value={editLicenseData ? editLicenseData.custo : newLicense.custo} onChange={(e) => editLicenseData ? setEditLicenseData({...editLicenseData, custo: e.target.value}) : setNewLicense({...newLicense, custo: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
                <input type="number" required placeholder="Qtd" value={editLicenseData ? editLicenseData.quantidade_total : newLicense.quantidade_total} onChange={(e) => editLicenseData ? setEditLicenseData({...editLicenseData, quantidade_total: e.target.value}) : setNewLicense({...newLicense, quantidade_total: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
              </div>
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold shadow-lg hover:-translate-y-1 transition-all duration-300">Salvar Licença</button>
            </form>
          </div>
        </div>
      )}

      {viewLicenseUsers && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Users className="text-blue-400"/> Usuários da Licença</h2>
              <button onClick={() => setViewLicenseUsers(null)} className="text-gray-400 hover:text-white p-2 transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <div className="max-h-96 overflow-y-auto space-y-3 custom-scrollbar">
              {viewLicenseUsers.assignments?.map((asg) => (
                <div key={asg.id} className="bg-black/50 p-4 rounded-xl flex justify-between items-center border border-gray-800 hover:border-gray-700 transition-colors">
                  <div><p className="text-brandGreen font-bold">{asg.employee?.nome}</p></div>
                  <button onClick={() => { unassignLicense(asg.id); setViewLicenseUsers(null); }} className="text-xs font-semibold text-red-400 hover:text-red-300 hover:underline transition-colors">Revogar Acesso</button>
                </div>
              ))}
              {(!viewLicenseUsers.assignments || viewLicenseUsers.assignments.length === 0) && (
                 <p className="text-gray-500 italic">Nenhum usuário alocado.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}