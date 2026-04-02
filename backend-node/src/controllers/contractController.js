const pdfParse = require('pdf-parse');
const { Contract, AuditLog } = require('../../config/db');
const { extractDataFromText } = require('../../utils/pdf_extractor');
const { writeAuditLog } = require('../../utils/audit');

exports.getAll = async (req, res) => {
  try {
    const contracts = await Contract.findAll({ order: [['id', 'DESC']] });
    return res.json({ data: contracts });
  } catch (error) {
    console.error("❌ Erro ao buscar contratos:", error.message);
    return res.status(500).json({ error: 'Erro ao buscar contratos' });
  }
};

exports.create = async (req, res) => {
  try {
    const { servico, mes_competencia, fornecedor } = req.body;

    // 🛡️ TRAVA ANTI-DUPLICAÇÃO: Evita lançar a mesma medição duas vezes
    const existing = await Contract.findOne({ 
      where: { 
        servico: servico.trim(), 
        fornecedor: (fornecedor || '').trim(),
        mes_competencia: mes_competencia 
      } 
    });

    if (existing) {
      return res.status(400).json({ 
        error: `Já existe uma medição registrada para '${servico}' no período ${mes_competencia}.` 
      });
    }

    const novoContrato = await Contract.create(req.body);
    await writeAuditLog(AuditLog, {
      action: 'CREATE',
      table_name: 'contracts',
      record_id: novoContrato.id,
      old_data: null,
      new_data: novoContrato.toJSON(),
      module: 'contracts',
      user: req.user?.email || req.user?.nome || null,
      details: 'Contrato criado via UI/API',
    });
    return res.status(201).json({ data: novoContrato });
  } catch (error) {
    console.error("❌ Erro ao cadastrar contrato:", error.message);
    return res.status(400).json({ error: 'Erro ao cadastrar contrato' });
  }
};

exports.update = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
    
    const oldData = contract.toJSON();
    await contract.update(req.body);
    await writeAuditLog(AuditLog, {
      action: 'UPDATE',
      table_name: 'contracts',
      record_id: contract.id,
      old_data: oldData,
      new_data: contract.toJSON(),
      module: 'contracts',
      user: req.user?.email || req.user?.nome || null,
      details: 'Contrato atualizado via UI/API',
    });
    return res.json({ data: contract });
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao atualizar contrato' });
  }
};

exports.delete = async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
    const oldData = contract.toJSON();
    await contract.destroy();
    await writeAuditLog(AuditLog, {
      action: 'DELETE',
      table_name: 'contracts',
      record_id: contract.id,
      old_data: oldData,
      new_data: null,
      module: 'contracts',
      user: req.user?.email || req.user?.nome || null,
      details: 'Contrato deletado via UI/API',
    });
    
    return res.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar contrato' });
  }
};

const extractMesCompetencia = (rawText) => {
  if (!rawText) return null;
  const m1 = rawText.match(/\b(0[1-9]|1[0-2])\/(20\d{2})\b/);
  if (m1) return `${m1[1]}/${m1[2]}`;

  // Fallback: tenta capturar "Competência: Março/2026" etc.
  const m2 = rawText.match(/compet[êe]ncia\s*[:\-]?\s*([A-Za-zÀ-ÿ]+)\s*\/\s*(20\d{2})/i);
  if (m2) {
    const monthName = m2[1].toLowerCase();
    const year = m2[2];
    const map = {
      janeiro: '01', fevereiro: '02', marco: '03', março: '03', abril: '04', maio: '05', junho: '06',
      julho: '07', agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
    };
    const mm = map[monthName] || null;
    if (mm) return `${mm}/${year}`;
  }
  return null;
};

// 📄 EXTRAÇÃO DE PDF (OCR / PARSER)
exports.analyzePdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não recebido no campo "file"' });
    }

    // Extração usando o buffer da memória
    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length === 0) {
      return res.status(400).json({ error: 'Texto não extraído (PDF protegido ou imagem)' });
    }

    const extracted = extractDataFromText(rawText);
    const mes_competencia = extractMesCompetencia(rawText) || new Date().toISOString().slice(5, 7) + '/' + new Date().getFullYear();

    const payload = {
      servico: extracted.descricao && extracted.descricao !== 'Ajustar lógica de captura de descrição'
        ? extracted.descricao
        : 'Importação PDF (OCR)',
      fornecedor: extracted.fornecedor || 'N/I',
      mes_competencia,
      valor_previsto: null,
      valor_realizado: extracted.valor || 0,
      url_contrato: null,
    };

    // Anti-duplicação mínima (serviço + fornecedor + competência)
    const existing = await Contract.findOne({
      where: { servico: payload.servico, fornecedor: payload.fornecedor, mes_competencia: payload.mes_competencia }
    });
    if (existing) {
      return res.status(200).json({
        message: 'Contrato já existe para este serviço/fornecedor/competência (import ignorado).',
        data: existing,
        extracted,
      });
    }

    const created = await Contract.create(payload);
    await writeAuditLog(AuditLog, {
      action: 'IMPORT',
      table_name: 'contracts',
      record_id: created.id,
      old_data: null,
      new_data: created.toJSON(),
      module: 'contracts',
      user: req.user?.email || req.user?.nome || null,
      details: `IMPORT via OCR: arquivo=${req.file.originalname || 'pdf'}`,
    });

    return res.status(201).json({
      message: 'PDF analisado e contrato criado.',
      extracted,
      data: created,
    });

  } catch (error) {
    console.error("❌ Erro no processamento do PDF:", error.message);
    return res.status(500).json({ error: 'O servidor não conseguiu ler este PDF.' });
  }
};