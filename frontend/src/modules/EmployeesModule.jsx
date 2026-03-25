import React, { useState } from 'react';
import { Search, X, Trash2, MoreVertical, ListChecks, CheckCircle, PowerOff, Edit2, Printer, Laptop, Smartphone, Cpu, Wifi, Database, Users, ExternalLink, AlertTriangle, Link } from 'lucide-react';
import { getAuthHeaders } from '../utils/helpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function EmployeesModule({ employees, assets, licenses, hasAccess, fetchData, requestConfirm, registerLog }) {
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [openActionMenu, setOpenActionMenu] = useState(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ nome: '', email: '', departamento: '', url_termo: '' });
  const [editEmployeeData, setEditEmployeeData] = useState(null);
  const [isAssignEmployeeModalOpen, setIsAssignEmployeeModalOpen] = useState(false);
  const [activeEmployee, setActiveEmployee] = useState(null);
  const [selectedItemForAssign, setSelectedItemForAssign] = useState('');
  const [selectedLicenseToAssign, setSelectedLicenseToAssign] = useState('');
// Substitua temporariamente a linha por esta (com a URL real do seu backend):
  const API_BASE_URL = 'https://silver-monkey-552153.hostingersite.com';  // ─── NOVOS ESTADOS: Modal de Offboarding com Checklist ───────────────────────
  const [isOffboardingModalOpen, setIsOffboardingModalOpen] = useState(false);
  const [offboardingTarget, setOffboardingTarget] = useState(null);
  const [offboardingChecks, setOffboardingChecks] = useState({
    onfly: false,
    megaErp: false,
    admin365: false,
    equipamentos: false,
  });
  const [offboardingTermoUrl, setOffboardingTermoUrl] = useState('');
  const [isSubmittingOffboarding, setIsSubmittingOffboarding] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────────

  const activeEmployees = employees.filter(e =>
    e.status !== 'Desligado' &&
    e.status !== 'Em Desligamento' &&
    e.offboarding !== true &&
    e.offboarding !== 1 &&
    e.nome.toLowerCase().includes(employeeSearchTerm.toLowerCase())
  );

  const availableAssignables = assets.filter(a => a.status === 'Disponível' && ['Notebook', 'Celular', 'CHIP', 'Starlink'].includes(a.asset_type));

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
          const res = await fetch(`${API_BASE_URL}/api/employees/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
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
      const res = await fetch(`${API_BASE_URL}/api/employees`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(newEmployee) });
      if (!res.ok) throw new Error("Erro ao salvar");
      registerLog('CREATE', 'Colaboradores', `Cadastrou funcionário ${newEmployee.nome}`);
      setIsEmployeeModalOpen(false);
      setNewEmployee({ nome: '', email: '', departamento: '', url_termo: '' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const saveEditEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees/${editEmployeeData.id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(editEmployeeData) });
      if (!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Colaboradores', `Editou dados do colab ID ${editEmployeeData.id}`);
      setEditEmployeeData(null);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteEmployee = (empId) => {
    requestConfirm('Excluir Colaborador', '🔴 EXCLUIR DEFINITIVAMENTE este colaborador? Esta ação não pode ser desfeita.', async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/employees/${empId}`, { method: 'DELETE', headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Erro");
        registerLog('DELETE', 'Colaboradores', `Deletou colab ID ${empId}`);
        setOpenActionMenu(null);
        fetchData();
      } catch (err) { alert(err.message); }
    }, true, 'Excluir Colaborador');
  };

  // ─── ABRE O MODAL DE CHECKLIST (não chama API ainda) ─────────────────────────
  const startOffboarding = (emp) => {
    setOpenActionMenu(null);
    setOffboardingTarget(emp);
    setOffboardingChecks({ onfly: false, megaErp: false, admin365: false, equipamentos: false });
    setOffboardingTermoUrl('');
    setIsOffboardingModalOpen(true);
  };

  // ─── TODOS OS CHECKS MARCADOS + URL PREENCHIDA ────────────────────────────────
  const allChecksValid =
    offboardingChecks.onfly &&
    offboardingChecks.megaErp &&
    offboardingChecks.admin365 &&
    offboardingChecks.equipamentos &&
    offboardingTermoUrl.trim().length > 0;

  // ─── CONFIRMA E ENVIA PARA A API ──────────────────────────────────────────────
  const confirmOffboarding = async () => {
    if (!allChecksValid || !offboardingTarget) return;

    setIsSubmittingOffboarding(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees/${offboardingTarget.id}/offboarding`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Em Desligamento',
          offboarding: true,
          // Envia o link do termo de devolução junto para persistir no registro
          url_termo_devolucao: offboardingTermoUrl.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro na rota de offboarding do servidor.');
      }

      registerLog('UPDATE', 'Revogação', `Iniciou Offboarding do colab ID ${offboardingTarget.id} — Checks: Onfly✓ MegaERP✓ Admin365✓ Equipamentos✓`);
      setIsOffboardingModalOpen(false);
      setOffboardingTarget(null);
      fetchData();
    } catch (err) {
      alert(`❌ Erro Crítico: ${err.message}`);
    } finally {
      setIsSubmittingOffboarding(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const submitAssignment = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/employees/${activeEmployee.id}/assign`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ asset_id: parseInt(selectedItemForAssign) }) });
      if (!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Inventário', `Atribuiu ativo ID ${selectedItemForAssign} ao colab ID ${activeEmployee.id}`);
      setIsAssignEmployeeModalOpen(false);
      setSelectedItemForAssign('');
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleAction = (assetId, action) => {
    requestConfirm('Confirmar Ação', `Tem certeza que deseja devolver este equipamento?`, async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/assets/${assetId}/${action}`, { method: 'PUT', headers: getAuthHeaders() });
        if (!res.ok) throw new Error("Erro");
        registerLog('UPDATE', 'Inventário', `Devolveu o ativo ID ${assetId}`);
        fetchData();
      } catch (err) { alert(err.message); }
    }, true, 'Devolver');
  };

  const assignLicenseToEmployee = async (empId, licenseId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/licenses/assign`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ employee_id: empId, license_id: parseInt(licenseId) }) });
      if (!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Licenças', `Atribuiu licença ${licenseId} ao colab ${empId}`);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const unassignLicense = async (assignmentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/licenses/unassign/${assignmentId}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Erro");
      registerLog('UPDATE', 'Licenças', `Revogou atribuição de licença ID ${assignmentId}`);
      fetchData();
    } catch (err) { alert(err.message); }
  };

  const generateTermoPDF = (employee) => {
    const doc = new jsPDF();
    const empAssets = getActiveAssetsForEmployee(employee.id);
    const marginX = 15;
    let cursorY = 20;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("TERMO DE RESPONSABILIDADE PELA GUARDA E USO DE", 105, cursorY, { align: "center" });
    cursorY += 7;
    doc.text("EQUIPAMENTO E FERRAMENTAS DE TRABALHO", 105, cursorY, { align: "center" });
    cursorY += 10;
    doc.setFontSize(12);
    doc.text("PSI ENERGY SOLUCAO EM AUTOMACAO DE ENERGIA LTDA", 105, cursorY, { align: "center" });
    cursorY += 15;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const addText = (text) => {
      doc.text(text, marginX, cursorY, { maxWidth: 180, align: "left", lineHeightFactor: 1.5 });
      const lines = doc.splitTextToSize(text, 180);
      cursorY += (lines.length * 5) + 3;
    };

    addText('PSI ENERGY SOLUCAO EM AUTOMACAO DE ENERGIA LTDA, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o número 14.475.723/0001-51, por seu representante legal, designada "PSI" e, de outro lado:');
    addText(`Empregado ou Prestador: ${employee.nome.toUpperCase()}, doravante designado(a) "RESPONSÁVEL", acordam o seguinte:`);

    cursorY += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Do Objeto de Responsabilidade:", marginX, cursorY);
    cursorY += 6;
    doc.setFont("helvetica", "normal");
    addText("O(a) RESPONSÁVEL reconhece ter recebido os seguintes equipamentos e ferramentas de trabalho, de propriedade da PSI Energy:");

    const tableData = empAssets.map(a => {
      let descInfo = 'Modelo não cadastrado';
      if (a.asset_type === 'Notebook') descInfo = `${a.notebook?.modelo || 'Modelo não cadastrado'} (Patrimônio: ${a.notebook?.patrimonio || 'S/N'})`;
      else if (a.asset_type === 'Celular') descInfo = `${a.celular?.modelo || 'Modelo não cadastrado'} ${a.celular?.imei ? `(IMEI: ${a.celular.imei})` : ''}`;
      else if (a.asset_type === 'CHIP') descInfo = `Linha: ${a.chip?.numero || '-'} (${a.chip?.plano || 'Sem plano'})`;
      else if (a.asset_type === 'Starlink') descInfo = `${a.starlink?.modelo || 'Modelo não cadastrado'} (Projeto: ${a.starlink?.projeto || '-'})`;
      return [a.asset_type.toUpperCase(), descInfo, '[  ] SIM    [  ] NÃO'];
    });

    if (tableData.length === 0) tableData.push(['-', '-', '[  ] SIM    [  ] NÃO']);

    autoTable(doc, {
      startY: cursorY,
      head: [['EQUIPAMENTO', 'MODELO/MARCA', 'DEVOLVIDO SEM AVARIA ?']],
      body: tableData,
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' }
    });
    cursorY = doc.lastAutoTable.finalY + 10;

    const addClause = (title, text) => {
      if (cursorY > 260) { doc.addPage(); cursorY = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(title, marginX, cursorY);
      cursorY += 6;
      doc.setFont("helvetica", "normal");
      addText(text);
    };

    addClause("Da Responsabilidade", "2 - O(a) RESPONSÁVEL compromete-se a:\n2.1. Utilizar os equipamentos e ferramentas exclusivamente para o desempenho de suas funções ou serviços contratados pela PSI Energy.\n2.2. Zelar pela boa conservação e guarda dos equipamentos e ferramentas, evitando seu desgaste ou danos fora do uso normal.\n2.3. Proibido realizar qualquer tipo de intervenção física no notebook e adornar o dispositivo.");
    addClause("Da Devolução", "3 - O(a) RESPONSÁVEL se compromete a cuidar bem dos equipamentos e ferramentas, devolvendo-os em ótimo estado ao final do nosso contrato de trabalho ou de prestação de serviços, excetuado seu desgaste natural.");
    addClause("Dos Danos ou Perda", "4 - Em caso de dano ou perda dos equipamentos ou ferramentas por negligência ou mau uso, o(a) RESPONSÁVEL poderá ser responsabilizado(a), conforme previsto no Artigo 462, § 1º da Consolidação das Leis do Trabalho e nos termos do contrato de prestação de serviços, se aplicável.");
    addClause("Das Disposições Gerais", "5 - Este termo é regido pelas leis trabalhistas vigentes e pelos termos do contrato de prestação de serviços, se aplicável. Qualquer disputa relacionada a ele será submetida à jurisdição local.\n\nPor estarem assim justos e contratados, firmam o presente termo em duas vias de igual teor e forma, na presença de duas testemunhas.");

    if (cursorY + 90 > 290) { doc.addPage(); cursorY = 20; } else { cursorY += 10; }

    const dataExtenso = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(`Jundiaí, ${dataExtenso}.`, marginX, cursorY);
    cursorY += 25;

    doc.line(15, cursorY, 95, cursorY);
    doc.line(115, cursorY, 195, cursorY);
    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("PSI ENERGY SOLUÇÃO EM AUTOMAÇÃO", 55, cursorY, { align: "center" });
    doc.text("DE ENERGIA LTDA", 55, cursorY + 4, { align: "center" });
    doc.text("Nome e Assinatura do(a) Empregado ou", 155, cursorY, { align: "center" });
    doc.text("Representante Legal", 155, cursorY + 4, { align: "center" });
    cursorY += 20;

    if (cursorY > 260) { doc.addPage(); cursorY = 20; }
    doc.setFontSize(10);
    doc.text("Testemunhas:", 15, cursorY);
    cursorY += 15;
    doc.line(15, cursorY, 95, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Nome:", 15, cursorY + 5);
    doc.text("RG:", 15, cursorY + 10);
    doc.text("CPF:", 15, cursorY + 15);
    doc.line(115, cursorY, 195, cursorY);
    doc.text("Nome:", 115, cursorY + 5);
    doc.text("RG:", 115, cursorY + 10);
    doc.text("CPF:", 115, cursorY + 15);

    registerLog('EXPORT', 'Colaboradores', `Gerou Termo PDF para ${employee.nome}`);
    doc.save(`Termo_PSI_${employee.nome.replace(/\s+/g, '_')}.pdf`);
  };

  // ─── COMPONENTE DO CHECKBOX DO MODAL ─────────────────────────────────────────
  const OffboardingCheckItem = ({ id, label, sublabel, checked, onChange }) => (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 select-none
        ${checked
          ? 'bg-emerald-900/30 border-emerald-500/60'
          : 'bg-gray-800/60 border-gray-700 hover:border-gray-500'
        }`}
    >
      <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition-all
        ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <input id={id} type="checkbox" checked={checked} onChange={onChange} className="hidden" />
      <div>
        <p className={`text-sm font-semibold transition-colors ${checked ? 'text-emerald-300' : 'text-gray-200'}`}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
    </label>
  );
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3 bg-gray-900/80 border border-gray-700 rounded-full px-4 py-2.5 w-full max-w-md focus-within:border-brandGreen transition-colors">
          <Search className="w-5 h-5 text-gray-400" />
          <input type="text" placeholder="Buscar colaborador por nome..." value={employeeSearchTerm} onChange={(e) => setEmployeeSearchTerm(e.target.value)} className="bg-transparent text-white outline-none w-full text-sm" />
          {employeeSearchTerm && <button onClick={() => setEmployeeSearchTerm('')} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>}
        </div>
        {hasAccess('employees', 'edit') && (
          <button onClick={() => setIsEmployeeModalOpen(true)} className="bg-brandGreen hover:bg-brandGreenHover text-white px-6 py-2.5 rounded-full font-semibold shadow-[0_4px_14px_rgba(16,185,129,0.39)] hover:-translate-y-1 transition-all">+ Novo Colaborador</button>
        )}
      </div>

      {selectedIds.length > 0 && hasAccess('employees', 'edit') && (
        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-2xl mb-4 flex justify-between items-center animate-fade-in">
          <span className="text-white font-bold">{selectedIds.length} selecionado(s)</span>
          <button onClick={handleBulkDelete} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"><Trash2 className="w-5 h-5" /> Excluir</button>
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
                <tr key={emp.id} className="hover:bg-gray-800/80 transition-colors">
                  <td className="px-6 py-4">{hasAccess('employees', 'edit') && <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelection(emp.id)} className="accent-brandGreen cursor-pointer w-4 h-4" />}</td>
                  <td className="px-6 py-4 font-bold text-white flex flex-col gap-1">
                    {emp.nome}
                    {emp.url_termo && (
                      <a href={emp.url_termo} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 w-fit">
                        <ExternalLink className="w-3 h-3" /> Termo Assinado
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-400">{emp.departamento}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-gray-800 px-2 py-1 rounded border border-gray-700">{empAssets.length} Hardware(s), {empLicenses.length} Software(s)</span>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button onClick={() => setOpenActionMenu(openActionMenu === emp.id ? null : emp.id)} className="p-2 hover:bg-gray-700 rounded-lg transition-colors"><MoreVertical className="w-5 h-5" /></button>
                    {openActionMenu === emp.id && (
                      <div className="absolute right-8 top-10 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-40 py-2 text-left animate-fade-in-up">
                        <button onClick={() => { setOpenActionMenu(null); setEditEmployeeData(emp); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><ListChecks className="w-4 h-4 text-blue-400" /> Gerenciar Perfil</button>
                        {hasAccess('employees', 'edit') && (
                          <>
                            <div className="border-t border-gray-700 my-1"></div>
                            <button onClick={() => { setOpenActionMenu(null); setActiveEmployee(emp); setIsAssignEmployeeModalOpen(true); setSelectedItemForAssign(''); }} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><CheckCircle className="w-4 h-4 text-brandGreen" /> Atribuir Novo Eqp.</button>
                            <div className="border-t border-gray-700 my-1"></div>
                            {/* Chama o novo modal de checklist ↓ */}
                            <button onClick={() => startOffboarding(emp)} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><PowerOff className="w-4 h-4 text-yellow-500" /> Iniciar Desligamento</button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3 transition-colors"><Trash2 className="w-4 h-4 text-red-500" /> Excluir</button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {activeEmployees.length === 0 && (
              <tr><td colSpan="5" className="text-center py-20 text-gray-500 italic">Nenhum colaborador encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          MODAL: CHECKLIST DE PRÉ-REQUISITOS DO OFFBOARDING
          Só libera o botão quando: 4 checkboxes ✓ + URL preenchida
      ══════════════════════════════════════════════════════════════════════════ */}
      {isOffboardingModalOpen && offboardingTarget && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-yellow-900/40 rounded-3xl p-6 w-full max-w-lg shadow-2xl shadow-yellow-900/10">

            {/* Header */}
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-yellow-500/10 border border-yellow-500/30 p-2.5 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Iniciar Desligamento</h2>
                  <p className="text-sm text-gray-400">{offboardingTarget.nome}</p>
                </div>
              </div>
              <button
                onClick={() => { setIsOffboardingModalOpen(false); setOffboardingTarget(null); }}
                className="text-gray-500 hover:text-white transition-colors mt-0.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Aviso */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 mb-5">
              <p className="text-xs text-yellow-300/80 leading-relaxed">
                Confirme que <strong className="text-yellow-300">todos os acessos foram bloqueados</strong> e os <strong className="text-yellow-300">equipamentos foram devolvidos</strong> antes de mover o colaborador para a fila de Revogação.
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2.5 mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Pré-requisitos do Desligamento
              </p>

              <OffboardingCheckItem
                id="check-onfly"
                label="Acesso bloqueado no Onfly"
                sublabel="Plataforma de gestão de viagens e despesas"
                checked={offboardingChecks.onfly}
                onChange={() => setOffboardingChecks(p => ({ ...p, onfly: !p.onfly }))}
              />
              <OffboardingCheckItem
                id="check-mega"
                label="Acesso bloqueado no Mega ERP"
                sublabel="Sistema de gestão empresarial"
                checked={offboardingChecks.megaErp}
                onChange={() => setOffboardingChecks(p => ({ ...p, megaErp: !p.megaErp }))}
              />
              <OffboardingCheckItem
                id="check-admin365"
                label="Acesso bloqueado no ADMIN 365"
                sublabel="Microsoft 365 / Azure AD — e-mail e apps"
                checked={offboardingChecks.admin365}
                onChange={() => setOffboardingChecks(p => ({ ...p, admin365: !p.admin365 }))}
              />
              <OffboardingCheckItem
                id="check-equipamentos"
                label="Equipamentos fisicamente devolvidos"
                sublabel="Notebook, celular, chip, Starlink, acessórios"
                checked={offboardingChecks.equipamentos}
                onChange={() => setOffboardingChecks(p => ({ ...p, equipamentos: !p.equipamentos }))}
              />
            </div>

            {/* Campo: URL do Termo de Devolução */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest block mb-2">
                Termo de Devolução Assinado <span className="text-red-400">*</span>
              </label>
              <div className={`flex items-center gap-2 bg-black/50 border rounded-xl px-3 py-2.5 transition-colors
                ${offboardingTermoUrl.trim().length > 0 ? 'border-emerald-500/50' : 'border-gray-700 focus-within:border-gray-500'}`}>
                <Link className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <input
                  type="url"
                  placeholder="Cole aqui o link do Drive/OneDrive..."
                  value={offboardingTermoUrl}
                  onChange={(e) => setOffboardingTermoUrl(e.target.value)}
                  className="bg-transparent text-white outline-none w-full text-sm placeholder-gray-600"
                />
                {offboardingTermoUrl.trim().length > 0 && (
                  <a href={offboardingTermoUrl} target="_blank" rel="noopener noreferrer" title="Verificar link" className="text-blue-400 hover:text-blue-300 flex-shrink-0">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Progresso visual */}
            <div className="flex gap-1.5 mb-5">
              {[offboardingChecks.onfly, offboardingChecks.megaErp, offboardingChecks.admin365, offboardingChecks.equipamentos, offboardingTermoUrl.trim().length > 0].map((done, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${done ? 'bg-emerald-500' : 'bg-gray-700'}`} />
              ))}
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => { setIsOffboardingModalOpen(false); setOffboardingTarget(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-xl font-semibold transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmOffboarding}
                disabled={!allChecksValid || isSubmittingOffboarding}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all
                  ${allChecksValid && !isSubmittingOffboarding
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_4px_14px_rgba(234,179,8,0.35)] hover:-translate-y-0.5'
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {isSubmittingOffboarding
                  ? 'Enviando...'
                  : allChecksValid
                    ? '✓ Confirmar Desligamento'
                    : `Aguardando ${[offboardingChecks.onfly, offboardingChecks.megaErp, offboardingChecks.admin365, offboardingChecks.equipamentos, offboardingTermoUrl.trim().length > 0].filter(Boolean).length}/5`
                }
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Cadastrar Colaborador</h2><button onClick={() => setIsEmployeeModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button></div>
            <form onSubmit={handleCreateEmployee} className="flex flex-col gap-4">
              <input type="text" placeholder="Nome Completo" required value={newEmployee.nome} onChange={(e) => setNewEmployee({ ...newEmployee, nome: e.target.value })} className="w-full bg-black/50 border border-gray-700 hover:border-brandGreen/50 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
              <input type="email" placeholder="E-mail" required value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} className="w-full bg-black/50 border border-gray-700 hover:border-brandGreen/50 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
              <input type="text" placeholder="Departamento" required value={newEmployee.departamento} onChange={(e) => setNewEmployee({ ...newEmployee, departamento: e.target.value })} className="w-full bg-black/50 border border-gray-700 hover:border-brandGreen/50 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
              <input type="url" placeholder="URL do Termo Assinado (Drive, OneDrive...)" value={newEmployee.url_termo} onChange={(e) => setNewEmployee({ ...newEmployee, url_termo: e.target.value })} className="w-full bg-black/50 border border-gray-700 hover:border-brandGreen/50 rounded-xl p-3 text-white focus:border-brandGreen outline-none transition-colors" />
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-4 shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all hover:-translate-y-1">Salvar Colaborador</button>
            </form>
          </div>
        </div>
      )}

      {editEmployeeData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-5xl my-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Users className="text-brandGreen" /> Painel: {editEmployeeData.nome}</h2>
              <div className="flex items-center gap-4">
                <button onClick={() => generateTermoPDF(editEmployeeData)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"><Printer className="w-4 h-4" /> Imprimir Termo PDF</button>
                <button onClick={() => setEditEmployeeData(null)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <form onSubmit={saveEditEmployee} className="flex flex-col gap-4 col-span-1 border-r border-gray-800 pr-6">
                <input type="text" required placeholder="Nome" value={editEmployeeData.nome} onChange={(e) => setEditEmployeeData({ ...editEmployeeData, nome: e.target.value })} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-lg p-3 text-white outline-none transition-colors" />
                <input type="email" required placeholder="E-mail" value={editEmployeeData.email} onChange={(e) => setEditEmployeeData({ ...editEmployeeData, email: e.target.value })} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-lg p-3 text-white outline-none transition-colors" />
                <input type="text" required placeholder="Departamento" value={editEmployeeData.departamento} onChange={(e) => setEditEmployeeData({ ...editEmployeeData, departamento: e.target.value })} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-lg p-3 text-white outline-none transition-colors" />
                <input type="url" placeholder="URL do Termo Assinado (Google Drive...)" value={editEmployeeData.url_termo || ''} onChange={(e) => setEditEmployeeData({ ...editEmployeeData, url_termo: e.target.value })} className="bg-black/50 border border-gray-700 focus:border-brandGreen rounded-lg p-3 text-white outline-none transition-colors" />
                {editEmployeeData.url_termo && (
                  <div className="flex justify-end -mt-2 mb-2">
                    <a href={editEmployeeData.url_termo} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-500/30 transition-colors">
                      <ExternalLink className="w-3 h-3" /> Abrir Termo Assinado
                    </a>
                  </div>
                )}
                <button type="submit" className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-bold transition-colors">Salvar Alterações</button>
              </form>

              <div className="col-span-1 border-r border-gray-800 pr-6">
                <h3 className="text-brandGreen font-bold mb-4">Hardware Físico</h3>
                <div className="space-y-3">
                  {getActiveAssetsForEmployee(editEmployeeData.id).map(asset => {
                    let assetDesc = 'Modelo não cadastrado';
                    if (asset.asset_type === 'Notebook') assetDesc = `${asset.notebook?.modelo || 'Modelo não cadastrado'} (Patrimônio: ${asset.notebook?.patrimonio || '-'})`;
                    else if (asset.asset_type === 'Celular') assetDesc = `${asset.celular?.modelo || 'Modelo não cadastrado'} ${asset.celular?.imei ? `(IMEI: ${asset.celular.imei})` : ''}`;
                    else if (asset.asset_type === 'CHIP') assetDesc = `Nº: ${asset.chip?.numero || '-'} (${asset.chip?.plano || '-'})`;
                    else if (asset.asset_type === 'Starlink') assetDesc = `${asset.starlink?.modelo || 'Modelo não cadastrado'} (Projeto: ${asset.starlink?.projeto || '-'})`;
                    return (
                      <div key={asset.id} className="bg-black/50 p-3 rounded-lg flex justify-between items-center border border-gray-800 hover:border-gray-700 transition-colors">
                        <div>
                          <p className="text-white font-bold text-sm">{asset.asset_type}</p>
                          <p className="text-xs text-gray-400">{assetDesc}</p>
                        </div>
                        <button onClick={() => handleAction(asset.id, 'unassign')} className="text-xs text-red-400 hover:text-red-300 hover:underline">Devolver</button>
                      </div>
                    );
                  })}
                  {getActiveAssetsForEmployee(editEmployeeData.id).length === 0 && <p className="text-sm text-gray-500 italic">Nenhum hardware vinculado.</p>}
                </div>
              </div>

              <div className="col-span-1">
                <h3 className="text-blue-400 font-bold mb-4">Licenças em Uso</h3>
                <div className="space-y-3 mb-4">
                  {getLicensesForEmployee(editEmployeeData.id).map(asg => (
                    <div key={asg.assignment_id} className="bg-black/50 p-3 rounded-lg flex justify-between items-center border border-gray-800 hover:border-gray-700 transition-colors">
                      <div><p className="text-white font-bold text-sm">{asg.license.nome}</p></div>
                      <button onClick={() => unassignLicense(asg.assignment_id)} className="text-xs text-red-400 hover:underline">Revogar</button>
                    </div>
                  ))}
                  {getLicensesForEmployee(editEmployeeData.id).length === 0 && <p className="text-sm text-gray-500 italic">Nenhuma licença vinculada.</p>}
                </div>
                {hasAccess('licenses', 'edit') && (
                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 mt-4 shadow-lg">
                    <p className="text-xs font-bold text-gray-400 mb-2">Atribuir Nova Licença</p>
                    <div className="flex gap-2">
                      <select className="w-full bg-black/80 border border-gray-700 hover:border-brandGreen/50 focus:border-brandGreen transition-colors rounded-lg p-2 text-white text-xs outline-none cursor-pointer" value={selectedLicenseToAssign || ''} onChange={(e) => setSelectedLicenseToAssign(e.target.value)}>
                        <option value="" disabled>Selecione o Software...</option>
                        {licenses.filter(lic => lic.quantidade_total > lic.quantidade_em_uso).map(lic => (
                          <option key={lic.id} value={lic.id}>{lic.nome} (Disp: {lic.quantidade_total - lic.quantidade_em_uso})</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => { if (selectedLicenseToAssign) { assignLicenseToEmployee(editEmployeeData.id, selectedLicenseToAssign); setSelectedLicenseToAssign(''); } }} className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors">Atribuir</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isAssignEmployeeModalOpen && activeEmployee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold text-white">Atribuir a <span className="text-brandGreen">{activeEmployee.nome.split(' ')[0]}</span></h2><button onClick={() => setIsAssignEmployeeModalOpen(false)} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button></div>
            <form onSubmit={submitAssignment} className="flex flex-col gap-4">
              <select required value={selectedItemForAssign} onChange={(e) => setSelectedItemForAssign(e.target.value)} className="w-full bg-black/50 border border-gray-700 hover:border-brandGreen/50 focus:border-brandGreen transition-colors rounded-xl p-3 text-white outline-none cursor-pointer">
                <option value="" disabled>Escolha na lista de Disponíveis...</option>
                {availableAssignables.map(asset => (<option key={asset.id} value={asset.id}>{asset.asset_type}: {asset.notebook?.patrimonio || asset.celular?.imei || asset.chip?.numero || asset.starlink?.projeto}</option>))}
              </select>
              <button type="submit" className="w-full bg-brandGreen hover:bg-brandGreenHover text-white py-4 rounded-full font-bold mt-4 shadow-[0_4px_14px_rgba(16,185,129,0.39)] transition-all hover:-translate-y-1">Confirmar Atribuição</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}