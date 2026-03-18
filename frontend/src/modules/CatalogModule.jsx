import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { getAuthHeaders, parseCurrencyToFloat } from '../utils/helpers';

export default function CatalogModule({ catalogItems, hasAccess, fetchData, formatCurrency, requestConfirm, registerLog }) {
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editCatalogData, setEditCatalogData] = useState(null);
  const [newCatalogItem, setNewCatalogItem] = useState({ category: 'Notebook', nome: '', valor: '' });

  const handleCreateCatalogItem = async (e) => { 
    e.preventDefault(); 
    const payload = { ...newCatalogItem, valor: parseCurrencyToFloat(newCatalogItem.valor) }; 
    try {
      const res = await fetch('http://localhost:8080/api/catalog', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error("Erro");
      registerLog('CREATE', 'Catálogo', `Cadastrou item: ${payload.nome}`); 
      setIsCatalogModalOpen(false); 
      setNewCatalogItem({ category: 'Notebook', nome: '', valor: '' });
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const handleUpdateCatalogItem = async (e) => { 
    e.preventDefault(); 
    const payload = { ...editCatalogData, valor: parseCurrencyToFloat(editCatalogData.valor) }; 
    try {
      const res = await fetch(`http://localhost:8080/api/catalog/${editCatalogData.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Catálogo', `Atualizou item no catálogo ID ${payload.id}`); 
      setEditCatalogData(null); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const handleDeleteCatalogItem = (id) => { 
    requestConfirm('Excluir do Catálogo', 'Certeza que deseja remover este item do catálogo base?', async () => { 
      await fetch(`http://localhost:8080/api/catalog/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      fetchData(); 
    }, true); 
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Tag className="text-brandGreen"/> Catálogo de Precificação Base</h2>
        {hasAccess('catalog', 'edit') && <button onClick={() => setIsCatalogModalOpen(true)} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-semibold">+ Novo Preço Base</button>}
      </div>
      <div className="bg-gray-900/80 border border-gray-800 rounded-3xl min-h-[400px]">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/50 border-b border-gray-800"><tr><th className="px-6 py-4">Categoria</th><th className="px-6 py-4">Modelo Exato / Serviço</th><th className="px-6 py-4">Valor Base / Previsto</th><th className="px-6 py-4 text-center">Ações</th></tr></thead>
          <tbody className="divide-y divide-gray-800">
            {catalogItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-800/80">
                <td className="px-6 py-4 font-bold text-white">{item.category}</td>
                <td className="px-6 py-4">{item.nome}</td>
                <td className="px-6 py-4 text-brandGreen font-bold">{formatCurrency(item.valor)}</td>
                <td className="px-6 py-4 text-center">
                  {hasAccess('catalog', 'edit') && (
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditCatalogData(item); setIsCatalogModalOpen(true); }} className="text-blue-400 hover:underline">Editar</button>
                      <button onClick={() => handleDeleteCatalogItem(item.id)} className="text-red-500 hover:underline">Excluir</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isCatalogModalOpen || editCatalogData) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Tag className="w-6 h-6 text-brandGreen"/> {editCatalogData ? 'Editar Preço' : 'Novo Preço Base'}</h2>
              <button onClick={() => { setIsCatalogModalOpen(false); setEditCatalogData(null); }} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={editCatalogData ? handleUpdateCatalogItem : handleCreateCatalogItem} className="flex flex-col gap-4">
              <select required value={editCatalogData ? editCatalogData.category : newCatalogItem.category} onChange={(e) => editCatalogData ? setEditCatalogData({...editCatalogData, category: e.target.value}) : setNewCatalogItem({...newCatalogItem, category: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none cursor-pointer">
                <option value="Notebook">Notebook</option><option value="Celular">Celular</option><option value="CHIP">CHIP</option><option value="Starlink">Starlink</option>
                {/* 👇 NOVA CATEGORIA ADICIONADA AQUI 👇 */}
                <option value="Contrato">Contrato de Serviço</option>
              </select>
              <input type="text" required placeholder={(editCatalogData ? editCatalogData.category : newCatalogItem.category) === 'Contrato' ? "Nome do Serviço (Ex: Backup Nuvem)" : "Nome Exato do Modelo (Ex: Dell 5420)"} value={editCatalogData ? editCatalogData.nome : newCatalogItem.nome} onChange={(e) => editCatalogData ? setEditCatalogData({...editCatalogData, nome: e.target.value}) : setNewCatalogItem({...newCatalogItem, nome: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              <input type="number" step="0.01" required placeholder="Valor (R$)" value={editCatalogData ? editCatalogData.valor : newCatalogItem.valor} onChange={(e) => editCatalogData ? setEditCatalogData({...editCatalogData, valor: e.target.value}) : setNewCatalogItem({...newCatalogItem, valor: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              <button type="submit" className="w-full bg-brandGreen text-white py-4 rounded-full font-bold">Salvar Preço</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}