const pdfParse = require('pdf-parse');
const { Contract } = require('../../config/db');

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
    const { servico, mes_competencia } = req.body;

    // 🛡️ TRAVA ANTI-DUPLICAÇÃO: Evita lançar a mesma medição duas vezes
    const existing = await Contract.findOne({ 
      where: { 
        servico: servico.trim(), 
        mes_competencia: mes_competencia 
      } 
    });

    if (existing) {
      return res.status(400).json({ 
        error: `Já existe uma medição registrada para '${servico}' no período ${mes_competencia}.` 
      });
    }

    const novoContrato = await Contract.create(req.body);
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
    
    await contract.update(req.body);
    return res.json({ data: contract });
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao atualizar contrato' });
  }
};

exports.delete = async (req, res) => {
  try {
    const deleted = await Contract.destroy({ where: { id: req.params.id } });
    if (deleted === 0) return res.status(404).json({ error: 'Contrato não encontrado' });
    
    return res.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar contrato' });
  }
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
      return res.status(200).send("ERRO: Texto não extraído (PDF protegido ou imagem)");
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(rawText);

  } catch (error) {
    console.error("❌ Erro no processamento do PDF:", error.message);
    return res.status(500).json({ error: 'O servidor não conseguiu ler este PDF.' });
  }
};