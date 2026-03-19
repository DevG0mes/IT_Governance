import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { getAuthHeaders, normalizeEmail, parseCurrencyToFloat } from '../utils/helpers';

export default function ImportModule({ hasAccess, employees, contracts, licenses, requestConfirm, registerLog, fetchData, isLoading }) {
  const [importCategory, setImportCategory] = useState('Colaboradores');
  const [previewData, setPreviewData] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const downloadTemplate = () => {
    let headers = "";
    if (importCategory === 'Colaboradores') headers = "Nome;Email;Departamento"; 
    if (importCategory === 'Notebooks') headers = "Patrimonio;Serial_Number;Modelo;Garantia;Status_Garantia;Status;Email_Colaborador"; 
    if (importCategory === 'Celulares') headers = "IMEI;Modelo;Grupo;Responsavel;Status;Email_Colaborador"; 
    if (importCategory === 'CHIPs') headers = "Numero;ICCID;Plano;Grupo;Responsavel;Vencimento_Plano;Status;Email_Colaborador"; 
    if (importCategory === 'Starlinks') headers = "Grupo;Modelo;Localizacao;Responsavel;Email_Conta;Senha_Conta;Senha_Wifi;Status"; 
    if (importCategory === 'Medições de Contratos') headers = "Servico;Mes_Competencia;Valor_Realizado";
    if (importCategory === 'Licenças (Cadastro)') headers = "Software;Fornecedor;Plano;Custo;Quantidade";
    if (importCategory === 'Vínculos de Licenças') headers = "Email_Colaborador;Software";
    
    const blob = new Blob(["\uFEFF" + headers + "\n"], { type: 'text/csv;charset=utf-8;' }); 
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Modelo_Importacao_${importCategory}.csv`; link.click();
  };

  const handleFileUpload = (e) => { 
    const file = e.target.files[0]; if (!file) return; 
    const reader = new FileReader(); reader.readAsText(file, 'UTF-8');
    reader.onload = function(event) { 
      let csvText = event.target.result; if (csvText.charCodeAt(0) === 0xFEFF) { csvText = csvText.substring(1); } 
      Papa.parse(csvText, { 
        header: true, skipEmptyLines: true, delimiter: csvText.includes(';') ? ';' : ',', transformHeader: h => h ? h.replace(/^\uFEFF/g, '').replace(/['"]/g, '').trim() : '', transform: v => typeof v === 'string' ? v.trim() : v, 
        complete: function(results) { 
          const cleanData = results.data.filter(row => { return Object.keys(row).length > 1 && Object.values(row).some(val => val && String(val).trim() !== ''); }); 
          if (cleanData.length === 0) { alert("⚠️ Erro: Planilha vazia."); return; } 
          setPreviewData(cleanData); 
        } 
      }); 
    };
  };

  const processImport = () => {
    if (!previewData || previewData.length === 0) return;
    requestConfirm('Confirmar Importação', `Deseja iniciar a importação de ${previewData.length} registros?`, async () => {
        setIsImporting(true); let successCount = 0; let errorCount = 0; let errorDetails = []; 
        const getVal = (row, ...keys) => { const foundKey = Object.keys(row).find(k => keys.some(searchKey => k.trim().toLowerCase() === searchKey.toLowerCase())); return foundKey ? String(row[foundKey]).trim() : ''; };
        const safeVal = (v) => !v || v === '0' || v.toLowerCase() === 'n/a' || v.toLowerCase() === '#n/d' ? '' : v;

        for (let i = 0; i < previewData.length; i++) {
          const row = previewData[i];
          try {
            if (importCategory === 'Colaboradores') {
              const nome = getVal(row, 'nome', 'name'); const email = getVal(row, 'email', 'e-mail'); const depto = getVal(row, 'departamento', 'depto', 'setor');
              if (!nome || !email) throw new Error("Falta Nome ou E-mail");
              const res = await fetch('http://localhost:8080/api/employees', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ nome: nome, email: email, departamento: depto }) }); if (!res.ok) throw new Error();
            
            } else if (importCategory === 'Medições de Contratos') {
              const servico = getVal(row, 'serviço', 'servico', 'nome'); const mes = getVal(row, 'mês', 'mes', 'competencia'); const realizadoStr = getVal(row, 'valor_realizado', 'realizado', 'pago');
              if (!servico || !mes) throw new Error("Falta Serviço ou Mês"); const baseContract = contracts.find(c => c.servico.toLowerCase() === servico.toLowerCase()); if (!baseContract) throw new Error(`Contrato '${servico}' não encontrado.`);
              const payload = { servico: baseContract.servico, fornecedor: baseContract.fornecedor, mes_competencia: mes, valor_previsto: parseFloat(baseContract.valor_previsto), valor_realizado: parseCurrencyToFloat(realizadoStr), url_contrato: baseContract.url_contrato };
              const res = await fetch('http://localhost:8080/api/contracts', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) }); if (!res.ok) throw new Error("Falha ao salvar");
            
            } else if (importCategory === 'Licenças (Cadastro)') {
              const software = getVal(row, 'software', 'nome'); const fornecedor = getVal(row, 'fornecedor'); const plano = getVal(row, 'plano') || 'Mensal'; const custo = parseCurrencyToFloat(getVal(row, 'custo', 'valor')); const qtd = parseInt(getVal(row, 'quantidade', 'qtd')) || 1;
              if (!software) throw new Error("Falta o nome do Software");
              const payload = { nome: software, fornecedor: fornecedor, plano: plano, custo: custo, quantidade_total: qtd };
              const res = await fetch('http://localhost:8080/api/licenses', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) }); if (!res.ok) throw new Error("Falha ao salvar");
            
            } else if (importCategory === 'Vínculos de Licenças') {
              const emailColab = normalizeEmail(getVal(row, 'email_colaborador', 'email')); const software = getVal(row, 'software', 'nome');
              const emp = employees.find(e => normalizeEmail(e.email) === emailColab); const lic = licenses.find(l => l.nome.toLowerCase() === software.toLowerCase());
              if (!emp) throw new Error(`Colaborador ${emailColab} não encontrado`); if (!lic) throw new Error(`Licença ${software} não encontrada`);
              const res = await fetch('http://localhost:8080/api/licenses/assign', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ employee_id: emp.id, license_id: lic.id }) }); if (!res.ok) throw new Error("Falha ao vincular");
            
            } else if (['Notebooks', 'Celulares', 'CHIPs', 'Starlinks'].includes(importCategory)) {
              let payload = {};
              
              const emailColab = normalizeEmail(getVal(row, 'email_colaborador', 'email', 'usuario'));
              const hasValidEmail = emailColab && emailColab.length > 3 && emailColab !== 'n/a' && emailColab !== '0' && emailColab !== '-';

              let rawStatus = getVal(row, 'status', 'situação', 'situacao');
              let finalStatus = 'Disponível'; 
              
              if (rawStatus) {
                  const normalizedStatus = rawStatus.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                  if (normalizedStatus === 'em uso') finalStatus = 'Em uso';
                  else if (normalizedStatus === 'manutencao') finalStatus = 'Manutenção';
                  else if (normalizedStatus === 'descartado') finalStatus = 'Descartado';
                  else if (normalizedStatus === 'inutilizado') finalStatus = 'Inutilizado';
                  else if (normalizedStatus.includes('renovacao') || normalizedStatus.includes('renovar')) finalStatus = 'Renovação';
                  else if (normalizedStatus.includes('extraviado') || normalizedStatus.includes('roubo')) finalStatus = 'Extraviado/Roubado';
                  else if (normalizedStatus === 'disponivel') finalStatus = 'Disponível';
              }

              let creationStatus = finalStatus;
              let willAssign = false;

              if (hasValidEmail && ['Disponível', 'Em uso'].includes(finalStatus)) {
                  creationStatus = 'Disponível'; 
                  willAssign = true;
              }

              if (importCategory === 'Starlinks') { 
                payload = { asset_type: 'Starlink', grupo: safeVal(getVal(row, 'grupo')), modelo_starlink: safeVal(getVal(row, 'modelo')), localizacao: safeVal(getVal(row, 'localizacao', 'local')), responsavel: safeVal(getVal(row, 'responsavel')), email: safeVal(getVal(row, 'email_conta', 'email')), senha: safeVal(getVal(row, 'senha_conta', 'senha')), senha_roteador: safeVal(getVal(row, 'senha_wifi', 'wifi')), status: creationStatus }; 
              } else if (importCategory === 'Notebooks') {
                payload = { asset_type: 'Notebook', patrimonio: safeVal(getVal(row, 'patrimonio')), serial_number: safeVal(getVal(row, 'serial_number', 'serial')), modelo_notebook: safeVal(getVal(row, 'modelo')), garantia: safeVal(getVal(row, 'garantia')), status_garantia: safeVal(getVal(row, 'status_garantia')) || 'No prazo', status: creationStatus };
              } else if (importCategory === 'Celulares') {
                payload = { asset_type: 'Celular', imei: safeVal(getVal(row, 'imei')), modelo_celular: safeVal(getVal(row, 'modelo')), grupo: safeVal(getVal(row, 'grupo')), responsavel: safeVal(getVal(row, 'responsavel')), status: creationStatus };
              } else if (importCategory === 'CHIPs') {
                payload = { asset_type: 'CHIP', numero: safeVal(getVal(row, 'numero', 'linha')), iccid: safeVal(getVal(row, 'iccid')), plano: safeVal(getVal(row, 'plano')), grupo: safeVal(getVal(row, 'grupo')), responsavel: safeVal(getVal(row, 'responsavel')), vencimento_plano: safeVal(getVal(row, 'vencimento_plano', 'vencimento')), status: creationStatus };
              }

              const res = await fetch('http://localhost:8080/api/assets', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(payload) }); 
              const resData = await res.json().catch(() => ({})); 

              if (!res.ok) { throw new Error(resData.error || "Falha ao gravar equipamento no banco."); }

              if (willAssign) {
                const emp = employees.find(e => normalizeEmail(e.email) === emailColab);
                if (!emp) {
                    throw new Error(`Salvo no Estoque/Obra, pois o E-mail '${emailColab}' não existe no sistema.`);
                }
                const assignRes = await fetch(`http://localhost:8080/api/employees/${emp.id}/assign`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ asset_id: resData.data.id })
                });
                if (!assignRes.ok) throw new Error(`Salvo no Estoque, erro ao vincular a '${emailColab}'.`);
              }
            }
            successCount++;
          } catch (err) { errorCount++; errorDetails.push(`Linha ${i+1}: ${err.message}`); }
        }
        registerLog('IMPORT', 'ETL', `Importou ${successCount} registros de ${importCategory}`); setIsImporting(false); setPreviewData(null); fetchData(); 
        if (errorCount > 0) { alert(`⚠️ ETL Concluído com ressalvas!\n\n✅ Sucesso: ${successCount}\n❌ Avisos de Vínculo: ${errorCount}\n\nÚltimos Avisos:\n${errorDetails.slice(-6).join('\n')}`); } else { alert(`✅ ETL Concluído com sucesso!`); }
    }, true, 'Iniciar Importação');
  };

  return (
    <div className="relative animate-fade-in min-h-[500px]">
      
      {/* OVERLAY DE LOADING DA TELA DE IMPORTAÇÃO E NAVEGAÇÃO */}
      {(isLoading || isImporting) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm rounded-3xl min-h-[500px] border border-gray-800">
          <Loader2 className={`w-16 h-16 animate-spin mb-4 ${isImporting ? 'text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'text-brandGreen drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`} />
          <p className={`font-bold animate-pulse tracking-widest uppercase text-sm ${isImporting ? 'text-blue-400' : 'text-brandGreen'}`}>
            {isImporting ? 'Processando Importação (ETL)...' : 'Atualizando Dados...'}
          </p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><UploadCloud className="text-blue-400"/> Central de Importação (ETL)</h2></div></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-brandGreen"/> 1. Escolha o tipo de dado</h3>
            <select value={importCategory} onChange={(e) => {setImportCategory(e.target.value); setPreviewData(null);}} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none hover:border-brandGreen/50 focus:border-brandGreen transition-colors mb-6 cursor-pointer">
              <option value="Colaboradores">Base de Colaboradores</option><option value="Notebooks">Inventário: Notebooks</option><option value="Celulares">Inventário: Celulares</option><option value="CHIPs">Inventário: CHIPs Movéis</option><option value="Starlinks">Inventário: Starlinks</option><option value="Medições de Contratos">Contratos: Medições Mensais</option><option value="Licenças (Cadastro)">Licenças (Cadastro Novo)</option><option value="Vínculos de Licenças">Vínculos: Dar Licença p/ Usuário</option>
            </select>
          </div>
          <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all duration-300 hover:-translate-y-1 shadow-lg"><Download className="w-5 h-5" /> Baixar Planilha Modelo</button>
        </div>
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <div>
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2"><UploadCloud className="w-5 h-5 text-blue-400"/> 2. Importar Planilha Preenchida</h3>
            <div className="border-2 border-dashed border-gray-700 hover:border-blue-500/50 hover:bg-blue-900/10 transition-colors rounded-xl p-8 text-center relative group">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <UploadCloud className="w-10 h-10 text-gray-500 group-hover:text-blue-400 transition-colors mx-auto mb-3" />
              <p className="text-white font-bold group-hover:text-blue-300 transition-colors">Clique ou Arraste o .CSV aqui</p>
            </div>
          </div>
        </div>
      </div>
      {previewData && (
        <div className="mt-8 bg-gray-900/80 backdrop-blur border border-gray-800 rounded-3xl shadow-xl overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><CheckCircle className="w-5 h-5 text-brandGreen"/> 3. Pré-visualização ({previewData.length} registros)</h3>
            {hasAccess('import', 'edit') && <button onClick={processImport} disabled={isImporting} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-bold shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all duration-300">{isImporting ? 'Processando...' : 'Confirmar e Salvar'}</button>}
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-black/60 text-gray-400 sticky top-0"><tr>{Object.keys(previewData[0] || {}).map((key, idx) => (<th key={idx} className="px-6 py-3">{key}</th>))}</tr></thead>
              <tbody className="divide-y divide-gray-800/50">{previewData.slice(0, 50).map((row, idx) => (<tr key={idx} className="hover:bg-gray-800/80 transition-colors">{Object.values(row).map((val, i) => (<td key={i} className="px-6 py-3">{val}</td>))}</tr>))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}