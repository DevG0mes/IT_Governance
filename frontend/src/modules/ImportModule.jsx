import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, Loader2, FileText, X, Send } from 'lucide-react';
import Papa from 'papaparse';
import Swal from 'sweetalert2';
import { normalizeEmail, parseCurrencyToFloat } from '../utils/helpers';
import api from '../services/api';

export default function ImportModule({ hasAccess, employees = [], contracts = [], licenses = [], assets = [], requestConfirm, registerLog, fetchData }) {
  const [importCategory, setImportCategory] = useState('Colaboradores');
  const [previewData, setPreviewData] = useState(null);
  const [pdfFiles, setPdfFiles] = useState([]);
  const [isImporting, setIsImporting] = useState(false);

  const downloadTemplate = () => {
    let headers = "";
    if (importCategory === 'Colaboradores') headers = "Nome;Email;Departamento";
    if (importCategory === 'Notebooks') headers = "Patrimonio;Serial_Number;Modelo;Garantia;Status_Garantia;Status;Email";
    if (importCategory === 'Celulares') headers = "IMEI;Modelo;Grupo;Responsavel;Status;Email";
    if (importCategory === 'CHIPs') headers = "Numero;ICCID;Plano;Grupo;Responsavel;Vencimento_Plano;Status;Email";
    if (importCategory === 'Starlinks') headers = "Grupo;Modelo;Localizacao;Projeto;Responsavel;Email_Responsavel;Email_Conta;Senha_Conta;Senha_Wifi;Status";
    if (importCategory === 'Medições de Contratos') headers = "Servico;Mes_Competencia;Valor_Realizado";
    if (importCategory === 'Licenças (Cadastro)') headers = "Software;Fornecedor;Plano;Custo;Quantidade";
    if (importCategory === 'Vínculos de Licenças') headers = "Email_Colaborador;Software";

    if (!headers) return;
    const blob = new Blob(["\uFEFF" + headers + "\n"], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Modelo_Importacao_${importCategory}.csv`;
    link.click();
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsText(file, 'UTF-8');
    reader.onload = (event) => {
      let csvText = event.target.result;
      if (csvText.charCodeAt(0) === 0xFEFF) csvText = csvText.substring(1);
      Papa.parse(csvText, {
        header: true, skipEmptyLines: true,
        delimiter: csvText.includes(';') ? ';' : ',',
        transformHeader: h => h.trim(),
        complete: (results) => {
          setPreviewData(results.data.filter(row => Object.values(row).some(v => v)));
          e.target.value = null;
        }
      });
    };
  };

  const handlePdfUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    setPdfFiles(prev => [...prev, ...files]);
  };

  const removePdf = (index) => setPdfFiles(prev => prev.filter((_, i) => i !== index));

  const processPdfImport = async () => {
    if (pdfFiles.length === 0) return;
    setIsImporting(true);
    try {
      let createdCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const file of pdfFiles) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await api.post('/api/contracts/analyze-pdf', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (res.status === 201) createdCount++;
          else skippedCount++;
        } catch (err) {
          errorCount++;
          console.error('Erro OCR:', err);
        }
      }

      Swal.fire('OCR Concluído', `Criados: ${createdCount} • Ignorados: ${skippedCount} • Erros: ${errorCount}`, 'success');
      registerLog('IMPORT', 'OCR', `PDFs processados=${pdfFiles.length} Criados=${createdCount} Ignorados=${skippedCount} Erros=${errorCount}`);
      setPdfFiles([]);
      fetchData();
    } finally {
      setIsImporting(false);
    }
  };

  const processImport = () => {
    if (!previewData || previewData.length === 0) return;
    if (!hasAccess('import', 'edit')) return Swal.fire('Erro', 'Sem permissão', 'error');

    requestConfirm('Confirmar Importação', `Deseja registrar ${previewData.length} linhas?`, async () => {
      setIsImporting(true);
      let successCount = 0;
      let errorCount = 0;

      const getVal = (row, ...keys) => {
        const foundKey = Object.keys(row).find(k => keys.some(searchKey => k.trim().toLowerCase() === searchKey.toLowerCase()));
        return foundKey ? String(row[foundKey]).trim() : '';
      };

      // Preferir bulk para assets (evita N requisições e timeout/429).
      if (['Notebooks', 'Celulares', 'CHIPs', 'Starlinks'].includes(importCategory)) {
        try {
          const items = previewData.map(row => {
            const emailColab = normalizeEmail(getVal(row, 'email', 'usuario', 'responsavel', 'email_colaborador', 'email_responsavel', 'email_responsavel'));
            const emp = employees.find(e => normalizeEmail(e.email) === emailColab);

            const assetType = importCategory === 'CHIPs' ? 'CHIP' : importCategory.slice(0, -1);

            return {
              asset_type: assetType,
              status: emp ? 'Em uso' : (getVal(row, 'status') || 'Disponível'),
              EmployeeId: emp ? emp.id : null,
              patrimonio: getVal(row, 'patrimonio', 'patrimônio'),
              serial_number: getVal(row, 'serial_number', 'serial'),
              modelo_notebook: getVal(row, 'modelo'),
              modelo_celular: getVal(row, 'modelo'),
              imei: getVal(row, 'imei'),
              numero: getVal(row, 'numero', 'linha'),
              iccid: getVal(row, 'iccid'),
              plano: getVal(row, 'plano'),
              grupo: getVal(row, 'grupo'),
              responsavel: getVal(row, 'responsavel'),
              vencimento_plano: getVal(row, 'vencimento_plano'),
              localizacao: getVal(row, 'localizacao'),
              projeto: getVal(row, 'projeto'),
              modelo_starlink: getVal(row, 'modelo'),
              email_responsavel: getVal(row, 'email_responsavel'),
              email: getVal(row, 'email_conta'),
              senha: getVal(row, 'senha_conta'),
              senha_roteador: getVal(row, 'senha_wifi')
            };
          });

          const bulkRes = await api.post('/api/assets/bulk', { items });
          const created = bulkRes.data?.created ?? 0;
          const skipped = bulkRes.data?.skipped ?? 0;
          const errs = bulkRes.data?.errors?.length ?? 0;

          setIsImporting(false);
          setPreviewData(null);
          fetchData();
          registerLog('IMPORT', 'ETL', `Assets bulk: Criados=${created} Ignorados=${skipped} Erros=${errs}`);
          Swal.fire('Finalizado', `Criados: ${created} • Ignorados: ${skipped} • Erros: ${errs}`, errs > 0 ? 'warning' : 'success');
          return;
        } catch (err) {
          setIsImporting(false);
          Swal.fire('Erro', err.response?.data?.error || err.message || 'Falha no bulk de ativos', 'error');
          return;
        }
      }

      for (let row of previewData) {
        try {
          // 1. COLABORADORES (Usa 'employees' para evitar duplicados)
          if (importCategory === 'Colaboradores') {
            const email = normalizeEmail(getVal(row, 'email', 'e-mail'));
            if (!employees.some(e => normalizeEmail(e.email) === email)) {
              await api.post('/api/employees', { nome: getVal(row, 'nome'), email, departamento: getVal(row, 'departamento') });
            }
          }
          
          // 2. ATIVOS (Usa 'assets' para validar e 'employees' para vincular)
          else if (['Notebooks', 'Celulares', 'CHIPs', 'Starlinks'].includes(importCategory)) {
            const emailColab = normalizeEmail(getVal(row, 'email', 'usuario', 'responsavel', 'email_colaborador', 'email_responsavel'));
            const emp = employees.find(e => normalizeEmail(e.email) === emailColab);
            
            let assetType = importCategory === 'CHIPs' ? 'CHIP' : importCategory.slice(0, -1);
            const pat = getVal(row, 'patrimonio', 'patrimônio', 'imei', 'numero');

            // Verifica duplicidade no array local antes de enviar
            if (assets.some(a => (a.notebook?.patrimonio === pat) || (a.celular?.imei === pat) || (a.chip?.numero === pat))) {
              throw new Error(`Item ${pat} já existe no sistema.`);
            }

            const payload = {
              asset_type: assetType,
              status: emp ? 'Em uso' : (getVal(row, 'status') || 'Disponível'),
              EmployeeId: emp ? emp.id : null,
              patrimonio: getVal(row, 'patrimonio', 'patrimônio'),
              serial_number: getVal(row, 'serial_number', 'serial'),
              modelo: getVal(row, 'modelo'),
              imei: getVal(row, 'imei'),
              numero: getVal(row, 'numero', 'linha'),
              iccid: getVal(row, 'iccid'),
              plano: getVal(row, 'plano'),
              grupo: getVal(row, 'grupo')
            };

            const res = await api.post('/api/assets', payload);
            const newAsset = res.data.data || res.data;

            // 🛡️ VÍNCULO HISTÓRICO: Garante que o hardware apareça no painel do colaborador
            if (emp && newAsset?.id) {
              // O segredo está no nome das chaves: asset_id e employee_id
              await api.put(`/api/employees/${emp.id}/assign`, { 
                  asset_id: newAsset.id, 
                  employee_id: emp.id 
              });
            }
          }

          // 3. MEDIÇÕES (Usa 'contracts' para verificação)
          else if (importCategory === 'Medições de Contratos') {
             const serv = getVal(row, 'servico');
             const mes = getVal(row, 'mes_competencia');
             if (!contracts.some(c => c.servico === serv && c.mes_competencia === mes)) {
               const valor = parseCurrencyToFloat(getVal(row, 'valor_realizado', 'valor'));
               await api.post('/api/contracts', { servico: serv, mes_competencia: mes, valor_realizado: valor });
             }
          }

          // 4. LICENÇAS (Usa 'licenses' para verificação)
          else if (importCategory === 'Licenças (Cadastro)') {
            const soft = getVal(row, 'software');
            if (!licenses.some(l => l.nome.toLowerCase() === soft.toLowerCase())) {
              await api.post('/api/licenses', { 
                  nome: soft, 
                  fornecedor: getVal(row, 'fornecedor'), 
                  quantidade_total: parseInt(getVal(row, 'quantidade')) || 1 
              });
            }
          }
          
          // 5. VÍNCULOS DE LICENÇAS (Employee <-> License)
          else if (importCategory === 'Vínculos de Licenças') {
            const email = normalizeEmail(getVal(row, 'email_colaborador', 'email', 'e-mail'));
            const software = getVal(row, 'software');
            if (!email || !software) continue;

            const emp = employees.find(e => normalizeEmail(e.email) === email);
            if (!emp) continue; // sem e-mail corporativo no sistema, não há como vincular

            const lic = licenses.find(l => (l.nome || '').toLowerCase().trim() === software.toLowerCase().trim());
            if (!lic) continue;

            // evita duplicidade com base no array local (quando já carregado)
            const existingAssignments = lic.EmployeeLicenses || lic.assignments || [];
            const already = existingAssignments.some(a => (a.EmployeeId === emp.id || a.employee_id === emp.id) && (a.license_id === lic.id || a.LicenseId === lic.id));
            if (already) continue;

            await api.post('/api/licenses/assign', { employee_id: emp.id, license_id: lic.id });
          }

          successCount++;
        } catch (err) {
          errorCount++;
          console.error("Erro na importação:", err);
        }
      }

      setIsImporting(false);
      setPreviewData(null);
      fetchData();
      registerLog('IMPORT', 'ETL', `Sucesso: ${successCount}, Erros: ${errorCount}`);
      Swal.fire('Finalizado', `Processados: ${successCount} registros.`, 'success');
    });
  };

  return (
    <div className="relative p-6 bg-gray-900 border border-gray-800 rounded-3xl min-h-[550px]">
      {isImporting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm rounded-3xl">
          <Loader2 className="w-16 h-16 text-green-500 animate-spin mb-4" />
          <p className="text-green-500 font-bold tracking-widest">SINCRONIZANDO DADOS...</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-black/40 rounded-2xl border border-gray-800">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FileSpreadsheet className="text-blue-400" /> 1. Categoria</h3>
          <select value={importCategory} onChange={(e) => {setImportCategory(e.target.value); setPreviewData(null);}} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white mb-4 outline-none focus:border-green-500">
            <option value="Colaboradores">Base de Colaboradores</option>
            <option value="Notebooks">Inventário: Notebooks</option>
            <option value="Celulares">Inventário: Celulares</option>
            <option value="CHIPs">Inventário: CHIPs</option>
            <option value="Starlinks">Inventário: Starlinks</option>
            <option value="Medições de Contratos">Contratos: Medições</option>
            <option value="Licenças (Cadastro)">Licenças (Cadastro)</option>
            <option value="Vínculos de Licenças">Vínculos de Licenças</option>
            <option value="Lote PDFs">📄 Lote PDFs (OCR)</option>
          </select>
          <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white py-2.5 rounded-xl hover:bg-gray-700 transition-all shadow-lg">
            <Download size={18} /> Baixar Modelo CSV
          </button>
        </div>

        <div className="p-6 bg-black/40 rounded-2xl border border-gray-800">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><UploadCloud className="text-blue-400" /> 2. Upload</h3>
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center relative hover:bg-green-500/5 transition-colors group">
            <input type="file" 
              accept={importCategory === 'Lote PDFs' ? '.pdf' : '.csv'} 
              multiple={importCategory === 'Lote PDFs'}
              onChange={importCategory === 'Lote PDFs' ? handlePdfUpload : handleCsvUpload} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <FileText className="w-10 h-10 text-gray-500 mx-auto mb-3 group-hover:text-green-500 transition-colors" />
            <p className="text-white text-sm">Arraste seus arquivos aqui</p>
          </div>
        </div>
      </div>

      {importCategory === 'Lote PDFs' && pdfFiles.length > 0 && (
        <div className="mb-6 bg-black/40 p-4 rounded-xl border border-gray-800 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
             <h4 className="text-white font-bold">PDFs na Fila ({pdfFiles.length})</h4>
             <button onClick={processPdfImport} className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-500 transition-all shadow-md"><Send size={16} /> Extrair Dados OCR</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {pdfFiles.map((file, idx) => (
              <div key={idx} className="bg-gray-800/50 p-2 rounded flex justify-between items-center border border-gray-700">
                <span className="text-xs text-gray-300 truncate max-w-[120px]">{file.name}</span>
                <button onClick={() => removePdf(idx)} className="text-red-400 hover:text-red-500 transition-colors"><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {previewData && (
        <div className="bg-black/60 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl animate-in zoom-in-95">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
            <h3 className="text-white font-bold flex items-center gap-2"><CheckCircle className="text-green-500" /> Pré-visualização</h3>
            <button onClick={processImport} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg hover:-translate-y-1">Gravar definitivamente no Banco</button>
          </div>
          <div className="max-h-64 overflow-y-auto">
             <table className="w-full text-left text-xs text-gray-400">
                <thead className="bg-black/90 sticky top-0">
                   <tr>{Object.keys(previewData[0] || {}).map((k, i) => <th key={i} className="p-3 border-b border-gray-800 uppercase font-bold text-gray-500">{k}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-gray-800/30">
                   {previewData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-800/20">
                         {Object.values(row).map((val, j) => <td key={j} className="p-3">{String(val)}</td>)}
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}
    </div>
  );
}