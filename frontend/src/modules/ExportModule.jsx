import React, { useState } from 'react';
import { DownloadCloud, Database, ListChecks } from 'lucide-react';
import Papa from 'papaparse';

export default function ExportModule({ assets, employees, licenses, contracts, registerLog }) {
  const [exportModule, setExportModule] = useState('Ativos');
  const [exportColumns, setExportColumns] = useState({ patrimonio_serial: true, tipo: true, status: true, modelo: true, dono: true });

  const handleExportCSV = () => {
    let dataToExport = [];
    if (exportModule === 'Colaboradores') { dataToExport = employees.map(e => ({ Nome: e.nome, Email: e.email, Departamento: e.departamento, Status: e.status })); } 
    else if (exportModule === 'Licenças') { dataToExport = licenses.map(l => ({ Software: l.nome, Fornecedor: l.fornecedor, Plano: l.plano, 'Custo Un.': l.custo, 'Total Comprado': l.quantidade_total, 'Em Uso': l.quantidade_em_uso })); } 
    else if (exportModule === 'Contratos') { dataToExport = contracts.map(c => ({ Serviço: c.servico, Fornecedor: c.fornecedor, Competência: c.mes_competencia, 'Vlr Previsto': c.valor_previsto, 'Vlr Realizado': c.valor_realizado, Link: c.url_contrato })); } 
    else {
        dataToExport = assets.map(a => {
            const activeAsg = a.assignments?.find(asg => !asg.returned_at); 
            const ownerName = activeAsg?.employee?.nome || a.starlink?.responsavel || a.celular?.responsavel || a.chip?.responsavel || 'Sem Dono'; 
            
            let exportRow = {};
            if (exportColumns.tipo) exportRow['Tipo'] = a.asset_type; 
            if (exportColumns.patrimonio_serial) { 
              exportRow['Patrimonio / Grupo'] = a.notebook?.patrimonio || a.starlink?.grupo || a.celular?.grupo || a.chip?.grupo || '-'; 
              exportRow['Serial / IMEI / Linha'] = a.notebook?.serial_number || a.celular?.imei || a.chip?.numero || '-'; 
            }
            if (exportColumns.modelo) exportRow['Modelo'] = a.notebook?.modelo || a.celular?.modelo || a.starlink?.modelo || '-'; 
            if (exportColumns.status) exportRow['Status'] = a.status; 
            if (exportColumns.dono) exportRow['Dono / Resp'] = ownerName;
            
            return exportRow;
        });
    }
    if (dataToExport.length === 0) { alert("Não há dados para exportar."); return; }
    const csv = Papa.unparse(dataToExport, { delimiter: ';' }); 
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); 
    link.download = `Relatorio_PSI_${exportModule}_${new Date().toISOString().slice(0,10)}.csv`; 
    link.click(); 
    registerLog('EXPORT', 'Relatórios', `Baixou CSV de ${exportModule}`);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-white flex items-center gap-2"><DownloadCloud className="text-purple-400"/> Exportador de Relatórios</h2></div></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl shadow-xl col-span-1 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-brandGreen"/> 1. Escolha a Base</h3>
          <select value={exportModule} onChange={(e) => setExportModule(e.target.value)} className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none mb-6 hover:border-brandGreen/50 focus:border-brandGreen transition-colors"><option value="Ativos">Inventário Físico (Ativos)</option><option value="Colaboradores">Base de Colaboradores</option><option value="Licenças">Licenças e Softwares</option><option value="Contratos">Contratos e Serviços Terceiros</option></select>
        </div>
        <div className="bg-gray-900/80 backdrop-blur border border-gray-800 p-6 rounded-3xl shadow-xl col-span-1 lg:col-span-2 transition-all duration-300 hover:shadow-[0_10px_25px_rgba(0,0,0,0.5)]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><ListChecks className="w-5 h-5 text-blue-400"/> 2. Personalize as Colunas</h3>
          {exportModule === 'Ativos' && (
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={exportColumns.tipo} onChange={(e) => setExportColumns({...exportColumns, tipo: e.target.checked})} className="w-4 h-4 accent-brandGreen"/> Tipo</label>
              <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={exportColumns.patrimonio_serial} onChange={(e) => setExportColumns({...exportColumns, patrimonio_serial: e.target.checked})} className="w-4 h-4 accent-brandGreen"/> Patrimônio/Grupo</label>
              <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={exportColumns.status} onChange={(e) => setExportColumns({...exportColumns, status: e.target.checked})} className="w-4 h-4 accent-brandGreen"/> Status</label>
              <label className="flex items-center gap-3 text-gray-300 cursor-pointer hover:text-white transition-colors"><input type="checkbox" checked={exportColumns.dono} onChange={(e) => setExportColumns({...exportColumns, dono: e.target.checked})} className="w-4 h-4 accent-brandGreen"/> Dono Atual / Responsável</label>
            </div>
          )}
        </div>
      </div>
      <div className="mt-8 flex justify-end">
        <button onClick={handleExportCSV} className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-[0_4px_14px_rgba(168,85,247,0.39)] hover:shadow-[0_6px_20px_rgba(168,85,247,0.23)] hover:-translate-y-1 transition-all duration-300"><DownloadCloud className="w-6 h-6"/> Baixar Relatório (CSV)</button>
      </div>
    </div>
  );
}