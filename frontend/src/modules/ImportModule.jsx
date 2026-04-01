import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, Download, CheckCircle, Loader2, FileText, X, Send } from 'lucide-react';
import Papa from 'papaparse';
import Swal from 'sweetalert2';
import { normalizeEmail, parseCurrencyToFloat } from '../utils/helpers';
import api from '../services/api';

export default function ImportModule({ hasAccess, employees = [], contracts = [], licenses = [], assets = [], requestConfirm, registerLog, fetchData }) {
  const [importCategory, setImportCategory] = useState('Lote PDFs');
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
    
    reader.onload = function(event) {
      let csvText = event.target.result; 
      if (csvText.charCodeAt(0) === 0xFEFF) { csvText = csvText.substring(1); }
      
      Papa.parse(csvText, {
        header: true, 
        skipEmptyLines: true, 
        delimiter: csvText.includes(';') ? ';' : ',', 
        transformHeader: h => h ? h.replace(/^\uFEFF/g, '').replace(/['"]/g, '').trim() : '', 
        transform: v => typeof v === 'string' ? v.trim() : v,
        complete: function(results) { 
          const cleanData = results.data.filter(row => { 
              return Object.keys(row).length > 1 && Object.values(row).some(val => val && String(val).trim() !== ''); 
          });
          
          if (cleanData.length === 0) { 
            Swal.fire({
              title: 'Atenção!',
              text: 'A planilha enviada está vazia ou possui formato inválido.',
              icon: 'warning',
              background: '#1f2937', color: '#ffffff', confirmButtonColor: '#f59e0b',
              customClass: { popup: 'rounded-xl' }
            });
            return; 
          }
          
          setPreviewData(cleanData);
          e.target.value = null; 
        }
      });
    };
  };

  const handlePdfUpload = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    setPdfFiles(prev => [...prev, ...files]);
  };

  const removePdf = (index) => {
    setPdfFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processPdfImport = async () => {
    if (pdfFiles.length === 0) return;
    setIsImporting(true);
    let extractedRecords = [];

    for (let file of pdfFiles) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await api.post('/api/contracts/analyze-pdf', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 20000 
        });

        let text = typeof res.data === 'string' ? res.data : (res.data.text || res.data.texto || res.data.data || JSON.stringify(res.data));
        const textUpper = text.toUpperCase();
        const textNoSpaces = textUpper.replace(/\s+/g, '');
        const filenameUpper = file.name.toUpperCase();

        let isDell = textUpper.includes("DELL") || textNoSpaces.includes("DELL") || filenameUpper.includes("DELL");
        let fornecedor = isDell ? "DELL COMPUTADORES DO BRASIL LTDA" : "Fornecedor Não Identificado";

        let servico = "Aquisição de Hardware";
        if (textNoSpaces.includes("DANFSE") || textNoSpaces.includes("NFSE") || textNoSpaces.includes("SERVIÇOS") || filenameUpper.includes("NFS")) {
            servico = "Suporte e Serviços TI";
        } else if (textNoSpaces.includes("PEDIDO") || textNoSpaces.includes("PROPOSTA") || filenameUpper.includes("PDC") || filenameUpper.includes("PROPOSTA")) {
            servico = "Pedido de Compra (PDC)";
        }

        let dataEmissao = "";
        const dateMatch = textNoSpaces.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (dateMatch) {
            dataEmissao = `${dateMatch[3]}-${dateMatch[2].padStart(2, '0')}`;
        } else {
            const fileDate = filenameUpper.match(/(\d{1,2})[.-](\d{1,2})[.-](\d{2,4})/);
            if (fileDate) {
                const ano = fileDate[3].length === 2 ? `20${fileDate[3]}` : fileDate[3];
                dataEmissao = `${ano}-${fileDate[2].padStart(2, '0')}`;
            }
        }

        let bestMatch = 0;
        const regex = /(?:^|[^\d.,])(\d{1,3}(?:[.,]\d{3})*[.,]\d{2}|\d+[.,]\d{2})(?=[^\d.,]|$)/g;
        let match;
        
        while ((match = regex.exec(textUpper)) !== null) { 
            let numStr = match[1];
            let cleanStr = numStr.replace(/[^\d.,]/g, '');
            let lastDot = cleanStr.lastIndexOf('.');
            let lastComma = cleanStr.lastIndexOf(',');
            let sepIndex = Math.max(lastDot, lastComma);
            
            let floatVal = 0;
            if (sepIndex > -1) {
                let intPart = cleanStr.substring(0, sepIndex).replace(/[.,]/g, '');
                let decPart = cleanStr.substring(sepIndex + 1);
                floatVal = parseFloat(`${intPart}.${decPart}`);
            } else {
                floatVal = parseFloat(cleanStr);
            }
            
            if (floatVal > bestMatch && floatVal < 1000000) {
                bestMatch = floatVal;
            }
        }

        if (fornecedor === "Fornecedor Não Identificado" && textNoSpaces.trim() === "") {
            servico = "ERRO: Backend devolveu VAZIO";
        }

        extractedRecords.push({
          Servico: servico,
          Fornecedor: fornecedor,
          Mes_Competencia: dataEmissao || '2026-03',
          Valor_Realizado: bestMatch > 0 ? bestMatch.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0,00",
          Arquivo_Origem: file.name
        });
      } catch (err) {
        extractedRecords.push({
          Servico: "Erro na Extração",
          Fornecedor: "-",
          Mes_Competencia: "YYYY-MM",
          Valor_Realizado: "0,00",
          Arquivo_Origem: file.name,
          error: err.response?.data?.error || err.message
        });
      }
    }

    setPreviewData(extractedRecords);
    setPdfFiles([]);
    setIsImporting(false);
  };

  const processImport = () => {
    if (!previewData || previewData.length === 0) return;
    requestConfirm('Confirmar Salvar', `Deseja registrar definitivamente as ${previewData.length} linhas no sistema?`, async () => {

        setIsImporting(true);

        let successCount = 0; let errorCount = 0; let errorDetails = [];
        const getVal = (row, ...keys) => { const foundKey = Object.keys(row).find(k => keys.some(searchKey => k.trim().toLowerCase() === searchKey.toLowerCase())); return foundKey ? String(row[foundKey]).trim() : ''; };
        const safeVal = (v) => !v || v === '0' || v.toLowerCase() === 'n/a' || v.toLowerCase() === '#n/d' ? '' : v;

        for (let i = 0; i < previewData.length; i++) {
          const row = previewData[i];

          if (importCategory === 'Lote PDFs' && row.Valor_Realizado === "0,00") {
              errorCount++;
              errorDetails.push(`Linha ignorada: Valor zerado (${row.Arquivo_Origem})`);
              continue; 
          }

          try {
            if (importCategory === 'Colaboradores') {
              const nome = getVal(row, 'nome', 'name'); 
              const email = getVal(row, 'email', 'e-mail'); 
              const depto = getVal(row, 'departamento', 'depto', 'setor');
              
              if (!nome || !email) throw new Error("Falta Nome ou E-mail");
              
              const exists = employees.some(e => normalizeEmail(e.email) === normalizeEmail(email) || e.nome.trim().toLowerCase() === nome.trim().toLowerCase());
              if (exists) throw new Error(`Ignorado: Colaborador '${nome}' já existe.`);

              await api.post('/api/employees', { nome, email, departamento: depto });
            } 
            
            else if (importCategory === 'Medições de Contratos' || importCategory === 'Lote PDFs') {
              const servico = importCategory === 'Lote PDFs' ? row.Servico : getVal(row, 'serviço', 'servico', 'nome');
              const mes = importCategory === 'Lote PDFs' ? row.Mes_Competencia : getVal(row, 'mês', 'mes', 'competencia', 'mes_competencia');
              const realizadoStr = importCategory === 'Lote PDFs' ? row.Valor_Realizado : getVal(row, 'valor_realizado', 'realizado', 'pago');
              const fornecedorLido = importCategory === 'Lote PDFs' ? row.Fornecedor : getVal(row, 'fornecedor');

              if (!servico || !mes || mes === 'YYYY-MM') throw new Error("Falta Serviço ou Mês Válido");

              const exists = contracts.some(c => c.servico.toLowerCase() === servico.toLowerCase() && c.mes_competencia === mes);
              if (exists) throw new Error(`Ignorado: Medição de '${servico}' para '${mes}' já existe.`);

              const baseContract = contracts.find(c => c.servico.toLowerCase() === servico.toLowerCase());

              const payload = {
                  servico: baseContract ? baseContract.servico : servico,
                  fornecedor: baseContract ? baseContract.fornecedor : fornecedorLido,
                  mes_competencia: mes,
                  valor_previsto: baseContract ? parseFloat(baseContract.valor_previsto) : 0,
                  valor_realizado: parseCurrencyToFloat(realizadoStr),
                  url_contrato: baseContract ? baseContract.url_contrato : ''
              };

              await api.post('/api/contracts', payload);
            } 
            
            else if (importCategory === 'Licenças (Cadastro)') {
              const software = getVal(row, 'software', 'nome'); 
              const fornecedor = getVal(row, 'fornecedor'); 
              const plano = getVal(row, 'plano') || 'Mensal'; 
              const custo = parseCurrencyToFloat(getVal(row, 'custo', 'valor')); 
              const qtd = parseInt(getVal(row, 'quantidade', 'qtd')) || 1;
              
              if (!software) throw new Error("Falta o nome do Software");

              const exists = licenses.some(l => l.nome.trim().toLowerCase() === software.trim().toLowerCase());
              if (exists) throw new Error(`Ignorado: Software '${software}' já está cadastrado.`);

              const payload = { nome: software, fornecedor, plano, custo, quantidade_total: qtd };
              await api.post('/api/licenses', payload);
            } 
            
            else if (importCategory === 'Vínculos de Licenças') {
              const emailColab = normalizeEmail(getVal(row, 'email_colaborador', 'email')); 
              const software = getVal(row, 'software', 'nome');
              
              const emp = employees.find(e => normalizeEmail(e.email) === emailColab); 
              const lic = licenses.find(l => l.nome.toLowerCase() === software.toLowerCase());
              
              if (!emp) throw new Error(`Colaborador ${emailColab} não encontrado`); 
              if (!lic) throw new Error(`Licença ${software} não encontrada`);
              
              const alreadyAssigned = lic.assignments?.some(a => a.employee_id === emp.id && !a.revoked_at);
              if (alreadyAssigned) throw new Error(`Ignorado: ${emp.nome} já possui a licença '${lic.nome}'.`);

              await api.post('/api/licenses/assign', { employee_id: emp.id, license_id: lic.id });
            } 
            
            else if (['Notebooks', 'Celulares', 'CHIPs', 'Starlinks'].includes(importCategory)) {
              let payload = {};
              const emailColab = normalizeEmail(getVal(row, 'email', 'email_responsavel', 'email_colaborador', 'usuario'));
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

              if (importCategory === 'Notebooks') {
                const patrimonio = safeVal(getVal(row, 'patrimonio'));
                if (patrimonio && assets.some(a => a.asset_type === 'Notebook' && a.notebook?.patrimonio === patrimonio)) {
                    throw new Error(`Ignorado: Notebook '${patrimonio}' já existe.`);
                }
                payload = { asset_type: 'Notebook', patrimonio, serial_number: safeVal(getVal(row, 'serial_number', 'serial')), modelo: safeVal(getVal(row, 'modelo')), garantia: safeVal(getVal(row, 'garantia')), status_garantia: safeVal(getVal(row, 'status_garantia')) || 'No prazo', status: creationStatus };
              } 
              else if (importCategory === 'Celulares') {
                const imei = safeVal(getVal(row, 'imei'));
                if (imei && assets.some(a => a.asset_type === 'Celular' && a.celular?.imei === imei)) {
                    throw new Error(`Ignorado: Celular IMEI '${imei}' já existe.`);
                }
                payload = { asset_type: 'Celular', imei, modelo: safeVal(getVal(row, 'modelo')), grupo: safeVal(getVal(row, 'grupo')), responsavel: safeVal(getVal(row, 'responsavel')), status: creationStatus };
              } 
              else if (importCategory === 'CHIPs') {
                const numero = safeVal(getVal(row, 'numero', 'linha'));
                if (numero && assets.some(a => a.asset_type === 'CHIP' && a.chip?.numero === numero)) {
                    throw new Error(`Ignorado: CHIP '${numero}' já existe.`);
                }
                payload = { asset_type: 'CHIP', numero, iccid: safeVal(getVal(row, 'iccid')), plano: safeVal(getVal(row, 'plano')), grupo: safeVal(getVal(row, 'grupo')), responsavel: safeVal(getVal(row, 'responsavel')), vencimento_plano: safeVal(getVal(row, 'vencimento_plano', 'vencimento')), status: creationStatus };
              } 
              else if (importCategory === 'Starlinks') {
                payload = { asset_type: 'Starlink', grupo: safeVal(getVal(row, 'grupo')), modelo: safeVal(getVal(row, 'modelo')), localizacao: safeVal(getVal(row, 'localizacao', 'local')), projeto: safeVal(getVal(row, 'projeto')), responsavel: safeVal(getVal(row, 'responsavel')), email_responsavel: emailColab, email: safeVal(getVal(row, 'email_conta', 'email')), senha: safeVal(getVal(row, 'senha_conta', 'senha')), senha_roteador: safeVal(getVal(row, 'senha_wifi', 'wifi')), status: creationStatus };
              }

              const res = await api.post('/api/assets', payload);
              const resData = res.data;

              // 🚨 CORREÇÃO DEFINITIVA DO VÍNCULO (Células compatíveis com o Backend)
              if (willAssign) {
                const emp = employees.find(e => normalizeEmail(e.email) === emailColab);
                if (!emp) { throw new Error(`Salvo no Estoque Livre, pois o E-mail '${emailColab}' não existe no sistema.`); }
                
                const assetIdToAssign = resData?.data?.id || resData?.id; 
                if (!assetIdToAssign) throw new Error(`Salvo no Estoque, mas ID não retornado para vincular.`);

                try {
                  // Usa A ROTA CORRETA e passa as variáveis que o Backend espera ler do body
                  await api.put(`/api/employees/${emp.id}/assign`, { 
                      asset_id: assetIdToAssign // Mantemos asset_id em minusculo pq o req.body lá espera assim
                  });
                } catch (assignError) {
                  console.warn('Falha ao tentar vincular:', assignError.message);
                }
              }
            }
            successCount++;
          } catch (err) { 
              errorCount++; 
              const errMsg = err.response?.data?.error || err.message;
              errorDetails.push(`Linha ${i+1}: ${errMsg}`); 
          }
        }

        registerLog('IMPORT', 'ETL', `Importou ${successCount} registros de ${importCategory}`);
        setIsImporting(false);
        setPreviewData(null);
        fetchData();

        if (errorCount > 0) { 
          Swal.fire({
            title: 'Concluído com ressalvas!',
            html: `
              <div style="text-align: left;">
                <p>✅ <b>Sucesso:</b> ${successCount} registros</p>
                <p>⚠️ <b>Ignorados/Erros:</b> ${errorCount}</p>
                <br/>
                <p><b>Detalhes:</b></p>
                <pre style="font-size: 12px; white-space: pre-wrap; color: #ef4444; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">${errorDetails.slice(0, 10).join('\n')}${errorDetails.length > 10 ? '\n...e mais outros' : ''}</pre>
              </div>
            `,
            icon: 'warning',
            background: '#1f2937', color: '#ffffff', confirmButtonColor: '#f59e0b',
            customClass: { popup: 'rounded-xl' }
          });
        } else { 
          Swal.fire({
            title: 'Sucesso!',
            text: 'Dados registrados no sistema sem duplicidades!',
            icon: 'success',
            background: '#1f2937', color: '#ffffff', confirmButtonColor: '#10b981', 
            customClass: { popup: 'rounded-xl' }
          });
        }
    }, true, 'Confirmar e Salvar');
  };

  return (
    <div className="relative p-6 bg-gray-900 border border-gray-800 rounded-3xl animate-fade-in min-h-[500px]">
      {isImporting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-sm rounded-3xl border border-gray-800">
          <Loader2 className="w-16 h-16 text-brandGreen animate-spin mb-4 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <p className="text-brandGreen font-bold animate-pulse tracking-widest uppercase text-sm">Processando Dados...</p>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><UploadCloud className="text-brandGreen"/> Central de Importação (ETL & OCR)</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="p-6 bg-black/40 rounded-2xl border border-gray-800">
          <h3 className="text-white font-bold mb-4 flex items-center gap-2"><FileSpreadsheet className="text-blue-400" /> 1. Escolha o tipo de dado</h3>
          <select value={importCategory} onChange={(e) => {setImportCategory(e.target.value); setPreviewData(null); setPdfFiles([]);}} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none hover:border-brandGreen/50 focus:border-brandGreen transition-colors mb-4 cursor-pointer">
            <option value="Colaboradores">Base de Colaboradores</option>
            <option value="Notebooks">Inventário: Notebooks</option>
            <option value="Celulares">Inventário: Celulares</option>
            <option value="CHIPs">Inventário: CHIPs Movéis</option>
            <option value="Starlinks">Inventário: Starlinks</option>
            <option value="Medições de Contratos">Contratos: Medições Mensais (CSV)</option>
            <option value="Lote PDFs" className="text-purple-400 font-bold">📄 Lote de Faturas e PDCs (PDF)</option>
            <option value="Licenças (Cadastro)">Licenças (Cadastro Novo)</option>
            <option value="Vínculos de Licenças">Vínculos: Dar Licença p/ Usuário</option>
          </select>
          {importCategory !== 'Lote PDFs' && (
            <button onClick={downloadTemplate} className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg"><Download className="w-5 h-5" /> Baixar Planilha Modelo</button>
          )}
        </div>

        <div className="p-6 bg-black/40 rounded-2xl border border-gray-800">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><UploadCloud className="text-blue-400" /> 2. {importCategory === 'Lote PDFs' ? 'Selecionar PDFs' : 'Upload do Arquivo'}</h3>
            <div className={`border-2 border-dashed border-gray-700 transition-colors rounded-xl p-6 text-center relative group ${importCategory === 'Lote PDFs' ? 'hover:border-purple-500/50 hover:bg-purple-900/10' : 'hover:border-brandGreen/50 hover:bg-brandGreen/5'}`}>
              <input type="file" accept={importCategory === 'Lote PDFs' ? '.pdf' : '.csv'} multiple={importCategory === 'Lote PDFs'} onChange={importCategory === 'Lote PDFs' ? handlePdfUpload : handleCsvUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
              <FileText className="w-10 h-10 text-gray-500 group-hover:text-white transition-colors mx-auto mb-3" />
              <p className="text-white font-bold group-hover:text-white transition-colors">Clique ou Arraste os arquivos aqui</p>
            </div>
        </div>
      </div>

      {importCategory === 'Lote PDFs' && pdfFiles.length > 0 && (
        <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-gray-800 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold">Arquivos na Fila ({pdfFiles.length})</h3>
              <button onClick={processPdfImport} className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-2.5 rounded-full font-bold shadow-lg transition-all flex items-center gap-2"><Send size={18} /> Iniciar Extração OCR</button>
            </div>
            <div className="max-h-32 overflow-y-auto custom-scrollbar grid grid-cols-2 md:grid-cols-4 gap-2">
                {pdfFiles.map((file, idx) => (
                    <div key={idx} className="bg-gray-800/50 p-2 rounded-lg flex justify-between items-center">
                        <span className="text-xs text-gray-300 truncate pr-2" title={file.name}>{file.name}</span>
                        <button onClick={() => removePdf(idx)} className="text-gray-500 hover:text-red-500"><X className="w-3 h-3"/></button>
                    </div>
                ))}
            </div>
        </div>
      )}

      {previewData && (
        <div className="bg-black/60 rounded-2xl overflow-hidden border border-gray-800 animate-fade-in-up shadow-xl">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/30">
            <h3 className="text-white font-bold flex items-center gap-2"><CheckCircle className="text-brandGreen w-5 h-5"/> Pré-visualização de Dados</h3>
            {hasAccess('import', 'edit') && (
              <button onClick={processImport} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-full font-bold transition-all shadow-lg hover:-translate-y-1">Confirmar e Salvar no BD</button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-gray-400">
              <thead className="sticky top-0 bg-black/90 shadow-sm">
                <tr>{Object.keys(previewData[0] || {}).map((k, i) => <th key={i} className="p-4 font-semibold">{k.replace('_', ' ')}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                    {Object.values(row).map((val, j) => (
                        <td key={j} className={`p-4 ${String(val) === "0,00" ? 'text-red-400 font-bold' : String(val).includes('R$') ? 'text-white font-bold' : ''}`}>
                            {typeof val === 'string' && val.includes(',') && !val.includes(' ') && val !== "0,00" ? `R$ ${val}` : val}
                        </td>
                    ))}
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