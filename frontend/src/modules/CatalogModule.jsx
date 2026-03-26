import React, { useState, useMemo } from 'react';
import { Tag, X } from 'lucide-react';
import { getAuthHeaders, parseCurrencyToFloat } from '../utils/helpers';

export default function CatalogModule({ catalogItems, assets = [], hasAccess, fetchData, formatCurrency, requestConfirm, registerLog }) {
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [editCatalogData, setEditCatalogData] = useState(null);
  const [newCatalogItem, setNewCatalogItem] = useState({ category: 'Notebook', nome: '', valor: '' });
  
  const [isManualMode, setIsManualMode] = useState(false);

  const selectedCategory = editCatalogData ? editCatalogData.category : newCatalogItem.category;
  const currentNome = editCatalogData ? editCatalogData.nome : newCatalogItem.nome;
// Substitua temporariamente a linha por esta (com a URL real do seu backend):
  const API_BASE_URL = 'https://paleturquoise-mallard-173694.hostingersite.com';  // Filtro Inteligente e Rigoroso: Puxa modelos distintos APENAS de suas tabelas reais
  const availableModels = useMemo(() => {
    const models = new Set();
    const targetCategory = (selectedCategory || '').trim().toLowerCase();

    // 1. Busca no Estoque Físico com Dupla Validação (Garante que a tabela não está nula)
    if (assets && assets.length > 0) {
      assets.forEach(a => {
        const type = (a.asset_type || '').trim().toLowerCase();
        
        if (type === targetCategory) {
          let val = '';
          if (targetCategory === 'notebook' && a.notebook) val = a.notebook.modelo;
          else if (targetCategory === 'celular' && a.celular) val = a.celular.modelo;
          else if (targetCategory === 'starlink' && a.starlink) val = a.starlink.modelo;
          else if (targetCategory === 'chip' && a.chip) val = a.chip.plano;
          
          if (val && val.trim() !== '') {
            models.add(val.trim());
          }
        }
      });
    }

    // 2. Busca no Catálogo Antigo
    if (catalogItems && catalogItems.length > 0) {
      catalogItems.forEach(c => {
        if ((c.category || '').trim().toLowerCase() === targetCategory && c.nome && c.nome.trim() !== '') {
          models.add(c.nome.trim());
        }
      });
    }

    if (editCatalogData && editCatalogData.category === selectedCategory && editCatalogData.nome) {
        models.add(editCatalogData.nome);
    }

    return Array.from(models).sort();
  }, [assets, catalogItems, selectedCategory, editCatalogData]);

  const handleCreateCatalogItem = async (e) => { 
    e.preventDefault(); 
    const payload = { ...newCatalogItem, valor: parseCurrencyToFloat(newCatalogItem.valor) }; 
    try {
      const res = await fetch(`${API_BASE_URL}/api/catalog`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error("Erro ao salvar");
      registerLog('CREATE', 'Catálogo', `Cadastrou item: ${payload.nome}`); 
      setIsCatalogModalOpen(false); 
      setNewCatalogItem({ category: 'Notebook', nome: '', valor: '' });
      setIsManualMode(false);
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const handleUpdateCatalogItem = async (e) => { 
    e.preventDefault(); 
    const payload = { ...editCatalogData, valor: parseCurrencyToFloat(editCatalogData.valor) }; 
    try {
      const res = await fetch(`${API_BASE_URL}/api/catalog/${editCatalogData.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(payload) });
      if(!res.ok) throw new Error("Erro ao atualizar");
      registerLog('UPDATE', 'Catálogo', `Atualizou item no catálogo ID ${payload.id}`); 
      setEditCatalogData(null); 
      setIsManualMode(false);
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const handleDeleteCatalogItem = (id) => { 
    requestConfirm('Excluir do Catálogo', 'Certeza que deseja remover este item do catálogo base?', async () => { 
      try {
        await fetch(`${API_BASE_URL}/api/catalog/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        fetchData(); 
      } catch (err) { alert("Erro ao excluir.", err); }
    }, true); 
  };

  const handleCategoryChange = (e) => {
    const val = e.target.value;
    setIsManualMode(false);
    if(editCatalogData) setEditCatalogData({...editCatalogData, category: val, nome: ''});
    else setNewCatalogItem({...newCatalogItem, category: val, nome: ''});
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Tag className="text-brandGreen"/> Catálogo de Precificação Base</h2>
        {hasAccess('catalog', 'edit') && <button onClick={() => { setIsCatalogModalOpen(true); setIsManualMode(false); }} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-semibold shadow-lg hover:-translate-y-1 transition-all">+ Novo Preço Base</button>}
      </div>
      
      <div className="bg-gray-900/80 border border-gray-800 rounded-3xl min-h-[400px]">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/50 border-b border-gray-800 uppercase text-xs">
            <tr><th className="px-6 py-4">Categoria</th><th className="px-6 py-4">Modelo Exato / Serviço</th><th className="px-6 py-4">Valor Base / Previsto</th><th className="px-6 py-4 text-center">Ações</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {catalogItems.map(item => (
              <tr key={item.id} className="hover:bg-gray-800/80 transition-colors">
                <td className="px-6 py-4 font-bold text-white">{item.category}</td>
                <td className="px-6 py-4">{item.nome}</td>
                <td className="px-6 py-4 text-brandGreen font-bold">{formatCurrency(item.valor)}</td>
                <td className="px-6 py-4 text-center">
                  {hasAccess('catalog', 'edit') && (
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditCatalogData(item); setIsManualMode(false); setIsCatalogModalOpen(true); }} className="text-blue-400 hover:text-blue-300 hover:underline">Editar</button>
                      <button onClick={() => handleDeleteCatalogItem(item.id)} className="text-red-500 hover:text-red-400 hover:underline">Excluir</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {catalogItems.length === 0 && (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">Nenhum item cadastrado no catálogo.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {(isCatalogModalOpen || editCatalogData) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2"><Tag className="w-6 h-6 text-brandGreen"/> {editCatalogData ? 'Editar Preço' : 'Novo Preço Base'}</h2>
              <button onClick={() => { setIsCatalogModalOpen(false); setEditCatalogData(null); setIsManualMode(false); }} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
            </div>
            
            <form onSubmit={editCatalogData ? handleUpdateCatalogItem : handleCreateCatalogItem} className="flex flex-col gap-4">
              
              <select required value={selectedCategory} onChange={handleCategoryChange} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none cursor-pointer">
                <option value="Notebook">Notebook</option>
                <option value="Celular">Celular</option>
                <option value="CHIP">CHIP</option>
                <option value="Starlink">Starlink</option>
                <option value="Contrato">Contrato de Serviço</option>
              </select>

              {selectedCategory === 'Contrato' || isManualMode ? (
                <div className="relative animate-fade-in">
                  <input 
                    type="text" 
                    required 
                    placeholder={selectedCategory === 'Contrato' ? "Nome do Serviço (Ex: Backup Nuvem)" : `Digite o novo ${selectedCategory === 'CHIP' ? 'plano' : 'modelo'}...`} 
                    value={currentNome} 
                    onChange={(e) => editCatalogData ? setEditCatalogData({...editCatalogData, nome: e.target.value}) : setNewCatalogItem({...newCatalogItem, nome: e.target.value})} 
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none pr-32" 
                  />
                  {selectedCategory !== 'Contrato' && (
                     <button type="button" onClick={() => { setIsManualMode(false); if(editCatalogData) setEditCatalogData({...editCatalogData, nome: ''}); else setNewCatalogItem({...newCatalogItem, nome: ''}); }} className="absolute right-3 top-3.5 text-brandGreen font-bold hover:text-brandGreenHover text-xs underline">
                       Ver Modelos do Estoque
                     </button>
                  )}
                </div>
              ) : (
                <div className="animate-fade-in">
                  <select 
                    required 
                    value={currentNome || ""} 
                    onChange={(e) => {
                      if (e.target.value === 'MANUAL') {
                        setIsManualMode(true);
                        if(editCatalogData) setEditCatalogData({...editCatalogData, nome: ''});
                        else setNewCatalogItem({...newCatalogItem, nome: ''});
                      } else {
                        if(editCatalogData) setEditCatalogData({...editCatalogData, nome: e.target.value});
                        else setNewCatalogItem({...newCatalogItem, nome: e.target.value});
                      }
                    }} 
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none cursor-pointer"
                  >
                    <option value="" disabled>Selecione o {selectedCategory === 'CHIP' ? 'plano' : 'modelo'} na lista...</option>
                    
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                    
                    <option value="MANUAL" className="font-bold text-brandGreen">➕ Digitar outro {selectedCategory === 'CHIP' ? 'plano' : 'modelo'} (Novo)...</option>
                  </select>
                  {availableModels.length === 0 && <p className="text-xs text-gray-500 mt-2 ml-1">Nenhum {selectedCategory.toLowerCase()} encontrado no banco. Selecione a opção "Digitar outro".</p>}
                </div>
              )}

              <input type="number" step="0.01" required placeholder="Valor (R$)" value={editCatalogData ? editCatalogData.valor : newCatalogItem.valor} onChange={(e) => editCatalogData ? setEditCatalogData({...editCatalogData, valor: e.target.value}) : setNewCatalogItem({...newCatalogItem, valor: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-2 shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all">Salvar Preço</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}