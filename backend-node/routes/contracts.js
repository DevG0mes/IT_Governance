// Arquivo: routes/contracts.js
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { Contract } = require('../config/db');

const router = express.Router();

// Configuração do Multer: Recebe o arquivo "file" na memória (Não usa disco, evita Erro 500 na Hostinger)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB por PDF
});

// ==========================================
// 1. CRUD BÁSICO DE CONTRATOS
// ==========================================

router.get('/', async (req, res) => {
  try {
    const contracts = await Contract.findAll({ order: [['id', 'DESC']] });
    // Ajustado para retornar { data: contracts } se o seu React esperar o padrão das outras rotas
    return res.json({ data: contracts });
  } catch (error) {
    console.error("❌ Erro ao buscar contratos:", error.message);
    return res.status(500).json({ error: 'Erro ao buscar contratos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const novoContrato = await Contract.create(req.body);
    return res.status(201).json({ data: novoContrato });
  } catch (error) {
    console.error("❌ Erro ao cadastrar contrato:", error.message);
    return res.status(400).json({ error: 'Erro ao cadastrar contrato' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
    
    await contract.update(req.body);
    return res.json({ data: contract });
  } catch (error) {
    return res.status(400).json({ error: 'Erro ao atualizar contrato' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Contract.destroy({ where: { id: req.params.id } });
    if (deleted === 0) return res.status(404).json({ error: 'Contrato não encontrado' });
    
    return res.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao deletar contrato' });
  }
});

// ==========================================
// 2. ANALYZE PDF (Extração de texto para IA/React)
// ==========================================

router.post('/analyze-pdf', upload.single('file'), async (req, res) => {
  try {
    // 1. Validação do arquivo
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não recebido no campo "file"' });
    }

    // 2. Extração usando buffer (pdf-parse)
    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text;

    // 3. Verificação de conteúdo (PDF Protegido ou Imagem/Scanner)
    if (!rawText || rawText.trim().length === 0) {
      // Retornamos 200 com a string de erro para o React tratar visualmente, igual no Go
      return res.status(200).send("ERRO: Texto não extraído (PDF protegido ou imagem)");
    }

    // 4. Envio do texto extraído
    // Forçamos o header para evitar que o navegador tente baixar o arquivo ou interpretar como HTML
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(200).send(rawText);

  } catch (error) {
    console.error("❌ Erro no processamento do PDF:", error.message);
    return res.status(500).json({ error: 'O servidor não conseguiu ler este PDF.' });
  }
});

module.exports = router;