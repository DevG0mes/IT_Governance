import React, { useState } from 'react';
import { Search, X, Trash2, MoreVertical, ListChecks, CheckCircle, PowerOff, Edit2, Printer, Laptop, Smartphone, Cpu, Wifi, Database, Users } from 'lucide-react';
import { getAuthHeaders } from '../utils/helpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function EmployeesModule({ employees, assets, licenses, hasAccess, fetchData, requestConfirm, registerLog }) {
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ nome: '', email: '', departamento: '' });
  const [editEmployeeData, setEditEmployeeData] = useState(null);
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [selectedItemForAssign, setSelectedItemForAssign] = useState('');
  const [selectedLicenseToAssign, setSelectedLicenseToAssign] = useState('');

  const activeEmployees = employees.filter(e => e.status !== 'Desligado' && e.nome.toLowerCase().includes(employeeSearchTerm.toLowerCase()));
  const availableAssignables = assets.filter(a => a.status === 'Disponível' && ['Notebook', 'Celular', 'CHIP'].includes(a.asset_type));

  const getActiveAssetsForEmployee = (empId) => assets.filter(a => a.status === 'Em uso' && a.assignments?.some(asg => asg.employee_id === empId && !asg.returned_at));
  const getLicensesForEmployee = (empId) => { 
    const empLics = []; 
    licenses.forEach(lic => { if (lic.assignments) { const asg = lic.assignments.find(a => a.employee_id === empId); if (asg) empLics.push({ assignment_id: asg.id, license: lic }); } }); 
    return empLics; 
  };

  const toggleSelection = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  const toggleAll = () => selectedIds.length === activeEmployees.length ? setSelectedIds([]) : setSelectedIds(activeEmployees.map(item => item.id));

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    requestConfirm('Exclusão em Massa', `ATENÇÃO: Excluir DEFINITIVAMENTE ${selectedIds.length} colaboradores?`, async () => {
        try {
            await Promise.all(selectedIds.map(async (id) => { 
              const res = await fetch(`http://localhost:8080/api/employees/${id}`, { method: 'DELETE', headers: getAuthHeaders() }); 
              if (!res.ok) throw new Error(`Falha no ID ${id}`); 
            }));
            registerLog('DELETE BULK', 'COLABORADORES', `Excluiu ${selectedIds.length} cols.`); 
            setSelectedIds([]); 
            fetchData(); 
        } catch (err) { alert(`❌ Erro: ${err.message}`); }
    }, true, 'Excluir');
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/employees', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newEmployee) });
      if(!res.ok) throw new Error("Erro ao salvar");
      registerLog('CREATE', 'Colaboradores', `Cadastrou funcionário ${newEmployee.nome}`); 
      setIsEmployeeModalOpen(false); 
      setNewEmployee({ nome: '', email: '', departamento: '' }); 
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const saveEditEmployee = async (e) => { 
    e.preventDefault(); 
    try {
      const res = await fetch(`http://localhost:8080/api/employees/${editEmployeeData.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(editEmployeeData) });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Colaboradores', `Editou dados do colab ID ${editEmployeeData.id}`); 
      setEditEmployeeData(null); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const handleDeleteEmployee = (empId) => { 
    requestConfirm('Excluir Colaborador', '🔴 EXCLUIR DEFINITIVAMENTE este colaborador? Esta ação não pode ser desfeita.', async () => { 
      try {
        const res = await fetch(`http://localhost:8080/api/employees/${empId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if(!res.ok) throw new Error("Erro");
        registerLog('DELETE', 'Colaboradores', `Deletou colab ID ${empId}`); 
        setOpenActionMenu(null); 
        fetchData(); 
      } catch(err){ alert(err.message); }
    }, true, 'Excluir Colaborador'); 
  };

  const toggleEmployeeStatus = (empId) => { 
    requestConfirm('Iniciar Offboarding', 'Desligar este colaborador devolverá TODOS os hardwares e LICENÇAS para o estoque. Continuar?', async () => { 
      try {
        const res = await fetch(`http://localhost:8080/api/employees/${empId}/toggle-status`, { method: 'PUT', headers: getAuthHeaders() });
        if(!res.ok) throw new Error("Erro");
        registerLog('UPDATE', 'Revogação', `Iniciou Offboarding do colab ID ${empId}`); 
        setOpenActionMenu(null); 
        setEditEmployeeData(null); 
        fetchData(); 
      } catch(err) { alert(err.message); }
    }, true, 'Iniciar Desligamento'); 
  };

  const submitAssignment = async (e) => { 
    e.preventDefault(); 
    try {
      const res = await fetch(`http://localhost:8080/api/employees/${activeEmployee.id}/assign`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ asset_id: parseInt(selectedItemForAssign) }) });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Inventário', `Atribuiu ativo ID ${selectedItemForAssign} ao colab ID ${activeEmployee.id}`); 
      setIsAssignEmployeeModalOpen(false); 
      setSelectedItemForAssign(''); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const handleAction = (assetId, action) => { 
    requestConfirm('Confirmar Ação', `Tem certeza que deseja devolver este equipamento?`, async () => { 
      try {
        const res = await fetch(`http://localhost:8080/api/assets/${assetId}/${action}`, { method: 'PUT', headers: getAuthHeaders() });
        if(!res.ok) throw new Error("Erro");
        registerLog('UPDATE', 'Inventário', `Devolveu o ativo ID ${assetId}`); 
        fetchData(); 
      } catch(err) { alert(err.message); }
    }, true, 'Devolver'); 
  };

  const assignLicenseToEmployee = async (empId, licenseId) => { 
    try {
      const res = await fetch('http://localhost:8080/api/licenses/assign', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ employee_id: empId, license_id: parseInt(licenseId) }) });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Licenças', `Atribuiu licença ${licenseId} ao colab ${empId}`); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const unassignLicense = async (assignmentId) => { 
    try {
      const res = await fetch(`http://localhost:8080/api/licenses/unassign/${assignmentId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if(!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Licenças', `Revogou atribuição de licença ID ${assignmentId}`); 
      fetchData(); 
    } catch(err) { alert(err.message); }
  };

  const generateTermoPDF = (employee) => {
    const doc = new jsPDF();
    const empAssets = getActiveAssetsForEmployee(employee.id);
    const marginX = 15;
    let cursorY = 20;

    // Cabeçalho
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TERMO DE RESPONSABILIDADE PELA GUARDA E USO DE", 105, cursorY, { align: "center" });
    cursorY += 7;
    doc.text("EQUIPAMENTO E FERRAMENTAS DE TRABALHO", 105, cursorY, { align: "center" });
    cursorY += 10;
    doc.setFontSize(12);
    doc.text("PSI ENERGY SOLUCAO EM AUTOMACAO DE ENERGIA LTDA", 105, cursorY, { align: "center" });
    cursorY += 15;

    // Função auxiliar para injetar o texto de forma segura e fazer a quebra de página
    const addText = (text, isBold = false) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(text, 180);
      
      // Se as próximas linhas passarem do limite da página, cria uma nova folha
      if (cursorY + (lines.length * 5) > 280) {
        doc.addPage();
        cursorY = 20;
      }
      doc.text(lines, marginX, cursorY, { align: "left", lineHeightFactor: 1.5 });
      cursorY += (lines.length * 5) + 3;
    };

    addText("PSI ENERGY SOLUCAO EM AUTOMACAO DE ENERGIA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o número 14.475.723/0001-51, por seu representante legal, designada “PSI” e, de outro lado:");
    addText(`Empregado ou Prestador: ${employee.nome.toUpperCase()}, doravante designado(a) “RESPONSÁVEL”, acordam o seguinte:`);

    cursorY += 2;
    addText("Do Objeto de Responsabilidade:", true);
    addText("1 - O(a) RESPONSÁVEL reconhece ter recebido os seguintes equipamentos e ferramentas de trabalho, de propriedade da PSI Energy:");

    // Tabela Dinâmica
    const tableData = empAssets.map(a => [
      a.asset_type.toUpperCase(),
      a.notebook?.modelo || a.celular?.modelo || a.chip?.numero || a.starlink?.grupo || '-',
      '[  ] SIM    [  ] NÃO'
    ]);
    if (tableData.length === 0) tableData.push(['-', '-', '[  ] SIM    [  ] NÃO']);

    autoTable(doc, {
      startY: cursorY,
      head: [['EQUIPAMENTO', 'MODELO/MARCA', 'DEVOLVIDO SEM AVARIA ?']],
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      margin: { left: marginX, right: marginX }
    });
    
    // Atualiza o cursorY com base em onde a tabela terminou
    cursorY = doc.lastAutoTable.finalY + 8;

    // Cláusulas Adicionais Completas
    addText("Da Responsabilidade", true);
    addText("2 - O(a) RESPONSÁVEL compromete-se a:\n2.1. Utilizar os equipamentos e ferramentas exclusivamente para o desempenho de suas funções ou serviços contratados pela PSI Energy.\n2.2. Zelar pela boa conservação e guarda dos equipamentos e ferramentas, evitando seu desgaste ou danos fora do uso normal.\n2.3. Proibido realizar qualquer tipo de intervenção física no notebook e adornar o dispositivo.");

    addText("Da Devolução", true);
    addText("3 - O(a) RESPONSÁVEL se compromete a cuidar bem dos equipamentos e ferramentas, devolvendo-os em ótimo estado ao final do nosso contrato de trabalho ou de prestação de serviços, excetuado seu desgaste natural.");

    addText("Dos Danos ou Perda", true);
    addText("4 - Em caso de dano ou perda dos equipamentos ou ferramentas por negligência ou mau uso, o(a) RESPONSÁVEL poderá ser responsabilizado(a), conforme previsto no Artigo 462, § 1º da Consolidação das Leis do Trabalho (“§ 1º - Em caso de dano causado pelo empregado, o desconto será lícito, desde que esta possibilidade tenha sido acordada ou na ocorrência de dolo do empregado.”) e nos termos do contrato de prestação de serviços, se aplicável.");

    addText("Das Disposições Gerais", true);
    addText("5 - Este termo é regido pelas leis trabalhistas vigentes e pelos termos do contrato de prestação de serviços, se aplicável. Qualquer disputa relacionada a ele será submetida à jurisdição local.\n\nPor estarem assim justos e contratados, firmam o presente termo em duas vias de igual teor e forma, na presença de duas testemunhas.");

    // ==========================================
    // TRAVA DE SEGURANÇA PARA AS ASSINATURAS
    // ==========================================
    // Exigimos 90 unidades de espaço para assinar e colocar as testemunhas sem cortar
    if (cursorY + 90 > 290) {
      doc.addPage();
      cursorY = 20;
    } else {
      cursorY += 10;
    }

    const dataExtenso = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Jundiaí, ${dataExtenso}.`, marginX, cursorY);
    cursorY += 25;

    // Linhas de Assinatura
    doc.line(15, cursorY, 95, cursorY);
    doc.line(115, cursorY, 195, cursorY);

    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);

    doc.text("PSI ENERGY SOLUÇÃO EM AUTOMAÇÃO", 55, cursorY, { align: "center" });
    doc.text("DE ENERGIA LTDA", 55, cursorY + 4, { align: "center" });

    doc.text("Nome e Assinatura do(a) Empregado ou", 155, cursorY, { align: "center" });
    doc.text("Representante Legal", 155, cursorY + 4, { align: "center" });

    cursorY += 15;

    // Testemunhas
    doc.setFontSize(10);
    doc.text("Testemunhas:", 15, cursorY);
    cursorY += 12;

    doc.line(15, cursorY, 95, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Nome:", 15, cursorY + 4);
    doc.text("RG:", 15, cursorY + 9);
    doc.text("CPF:", 15, cursorY + 14);

    doc.line(115, cursorY, 195, cursorY);
    doc.text("Nome:", 115, cursorY + 4);
    doc.text("RG:", 115, cursorY + 9);
    doc.text("CPF:", 115, cursorY + 14);

    registerLog('EXPORT', 'Colaboradores', `Gerou Termo PDF para ${employee.nome}`);
    doc.save(`Termo_PSI_${employee.nome.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 bg-gray-900/80 border border-gray-700 rounded-full px-4 py-2.5 w-full max-w-md focus-within:border-brandGreen transition-colors">
          <Search className="w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar colaborador por nome..." value={employeeSearchTerm} onChange={(e) => setEmployeeSearchTerm(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
          {employeeSearchTerm && <button onClick={() => setEmployeeSearchTerm('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4"/></button>}
        </div>
        {hasAccess('employees', 'edit') && (
          <button onClick={() => setIsEmployeeModalOpen(true)} className="bg-brandGreen text-white px-6 py-2.5 rounded-full font-semibold shadow-lg hover:-translate-y-1 transition-all">+ Novo Colaborador</button>
        )}
      </div>

      {selectedIds.length > 0 && hasAccess('employees', 'edit') && (
        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-2xl mb-4 flex justify-between items-center">
          <span className="text-white font-bold">{selectedIds.length} selecionado(s)</span>
          <button onClick={handleBulkDelete} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2"><Trash2 className="w-5 h-5" /> Excluir</button>
        </div>
      )}

      <div className="bg-gray-900/80 border border-gray-800 rounded-3xl min-h-[400px] overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-black/60 text-gray-400 border-b border-gray-800 uppercase text-xs">
            <tr>
              <th className="px-6 py-4 w-12">{hasAccess('employees', 'edit') && <input type="checkbox" checked={selectedIds.length === activeEmployees.length && activeEmployees.length > 0} onChange={toggleAll} className="accent-brandGreen cursor-pointer w-4 h-4" />}</th>
              <th className="px-6 py-4">Nome</th><th className="px-6 py-4">Departamento</th><th className="px-6 py-4">Ativos Vinculados</th><th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {activeEmployees.map(emp => { 
              const empAssets = getActiveAssetsForEmployee(emp.id); 
              const empLicenses = getLicensesForEmployee(emp.id); 
              return (
                <tr key={emp.id} className="hover:bg-gray-800/80">
                  <td className="px-6 py-4">{hasAccess('employees', 'edit') && <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelection(emp.id)} className="accent-brandGreen cursor-pointer w-4 h-4" />}</td>
                  <td className="px-6 py-4 font-bold text-white">{emp.nome}</td>
                  <td className="px-6 py-4 text-gray-400">{emp.departamento}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded border border-gray-700">{empAssets.length} Hardware(s), {empLicenses.length} Software(s)</span>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button onClick={() => setOpenActionMenu(openActionMenu === emp.id ? null : emp.id)} className="p-2 hover:bg-gray-700 rounded-lg"><MoreVertical className="w-5 h-5" /></button>
                    {openActionMenu === emp.id && (
                      <div className="absolute right-8 top-10 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-40 py-2 text-left">
                        <button onClick={() => { setOpenActionMenu(null); setEditEmployeeData(emp); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><ListChecks className="w-4 h-4 text-blue-400"/> Gerenciar Perfil</button>
                        {hasAccess('employees', 'edit') && (
                          <>
                            <div className="border-t border-gray-700 my-1"></div>
                            <button onClick={() => { setOpenActionMenu(null); setActiveEmployee(emp); setIsAssignEmployeeModalOpen(true); setSelectedItemForAssign(''); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><CheckCircle className="w-4 h-4 text-brandGreen"/> Atribuir Novo Eqp.</button>
                            <div className="border-t border-gray-700 my-1"></div>
                            <button onClick={() => toggleEmployeeStatus(emp.id)} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><PowerOff className="w-4 h-4 text-yellow-500"/> Iniciar Desligamento</button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"><Trash2 className="w-4 h-4 text-red-500"/> Excluir</button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Cadastrar Colaborador</h2><button onClick={() => setIsEmployeeModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleCreateEmployee} className="flex flex-col gap-4">
              <input type="text" placeholder="Nome Completo" required value={newEmployee.nome} onChange={(e) => setNewEmployee({...newEmployee, nome: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              <input type="email" placeholder="E-mail" required value={newEmployee.email} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              <input type="text" placeholder="Departamento" required value={newEmployee.departamento} onChange={(e) => setNewEmployee({...newEmployee, departamento: e.target.value})} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white focus:border-brandGreen outline-none" />
              <button type="submit" className="w-full bg-brandGreen text-white py-4 rounded-full font-bold mt-4">Salvar Colaborador</button>
            </form>
          </div>
        </div>
      )}

      {editEmployeeData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-5xl my-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="text-brandGreen"/> Painel: {editEmployeeData.nome}</h2>
              <div className="flex items-center gap-4">
                <button onClick={() => generateTermoPDF(editEmployeeData)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Printer className="w-4 h-4" /> Imprimir Termo PDF</button>
                <button onClick={() => setEditEmployeeData(null)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <form onSubmit={saveEditEmployee} className="flex flex-col gap-4 col-span-1 border-r border-gray-800 pr-6">
                <input type="text" required value={editEmployeeData.nome} onChange={(e) => setEditEmployeeData({...editEmployeeData, nome: e.target.value})} className="bg-black/50 border border-gray-700 rounded-lg p-3 text-white outline-none" />
                <input type="email" required value={editEmployeeData.email} onChange={(e) => setEditEmployeeData({...editEmployeeData, email: e.target.value})} className="bg-black/50 border border-gray-700 rounded-lg p-3 text-white outline-none" />
                <input type="text" required value={editEmployeeData.departamento} onChange={(e) => setEditEmployeeData({...editEmployeeData, departamento: e.target.value})} className="bg-black/50 border border-gray-700 rounded-lg p-3 text-white outline-none" />
                <button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold">Salvar Alterações</button>
              </form>
              <div className="col-span-1 border-r border-gray-800 pr-6">
                <h3 className="text-brandGreen font-bold mb-4">Hardware Físico</h3>
                <div className="space-y-3">
                  {getActiveAssetsForEmployee(editEmployeeData.id).map(asset => (
                    <div key={asset.id} className="bg-black/50 p-3 rounded-lg flex justify-between items-center border border-gray-800">
                      <div>
                        <p className="text-white font-bold text-sm">{asset.asset_type}</p>
                        <p className="text-xs text-gray-400">{asset.notebook?.patrimonio || asset.celular?.imei || asset.chip?.numero || asset.starlink?.projeto}</p>
                      </div>
                      <button onClick={() => handleAction(asset.id, 'unassign')} className="text-xs text-red-400 hover:text-red-300 hover:underline">Devolver</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-1">
                <h3 className="text-blue-400 font-bold mb-4">Licenças em Uso</h3>
                <div className="space-y-3 mb-4">
                  {getLicensesForEmployee(editEmployeeData.id).map(asg => (
                    <div key={asg.assignment_id} className="bg-black/50 p-3 rounded-lg flex justify-between items-center border border-gray-800">
                      <div><p className="text-white font-bold text-sm">{asg.license.nome}</p></div>
                      <button onClick={() => unassignLicense(asg.assignment_id)} className="text-xs text-red-400 hover:underline">Revogar</button>
                    </div>
                  ))}
                </div>
                {hasAccess('licenses', 'edit') && (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mt-4 shadow-lg">
                    <p className="text-xs font-bold text-gray-400 mb-2">Atribuir Nova Licença</p>
                    <div className="flex gap-2">
                      <select className="w-full bg-black/80 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none cursor-pointer" value={selectedLicenseToAssign || ''} onChange={(e) => setSelectedLicenseToAssign(e.target.value)}>
                        <option value="" disabled>Selecione o Software...</option>
                        {licenses.filter(lic => lic.quantidade_total > lic.quantidade_em_uso).map(lic => (
                          <option key={lic.id} value={lic.id}>{lic.nome} (Disp: {lic.quantidade_total - lic.quantidade_em_uso})</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => { if(selectedLicenseToAssign) { assignLicenseToEmployee(editEmployeeData.id, selectedLicenseToAssign); setSelectedLicenseToAssign(''); } }} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-xs font-bold">Atribuir</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAssignEmployeeModalOpen && activeEmployee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Atribuir a <span className="text-brandGreen">{activeEmployee.nome.split(' ')[0]}</span></h2><button onClick={() => setIsAssignEmployeeModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button></div>
            <form onSubmit={submitAssignment} className="flex flex-col gap-4">
              <select required value={selectedItemForAssign} onChange={(e) => setSelectedItemForAssign(e.target.value)} className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white outline-none cursor-pointer">
                <option value="" disabled>Escolha na lista de Disponíveis...</option>
                {availableAssignables.map(asset => (<option key={asset.id} value={asset.id}>{asset.asset_type}: {asset.notebook?.patrimonio || asset.celular?.imei || asset.chip?.numero}</option>))}
              </select>
              <button type="submit" className="w-full bg-brandGreen text-white py-4 rounded-full font-bold mt-4">Confirmar Atribuição</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}