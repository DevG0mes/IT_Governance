// Arquivo: routes/contracts.js
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse'); // O equivalente ao ledongthuc/pdf
const { Contract } = require('../config/db');

const router = express.Router();

// Configura o Multer para receber o arquivo "file" na memória (igual ao c.FormFile do Go)
const upload = multer({ storage: multer.memoryStorage() });

// ==========================================
// 1. CRUD BÁSICO DE CONTRATOS
// ==========================================

router.get('/', async (req, res) => {
  try {
    const contracts = await Contract.findAll();
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar contratos' });
  }
});

router.post('/', async (req, res) => {
  try {
    const novoContrato = await Contract.create(req.body);
    res.status(201).json(novoContrato);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao cadastrar contrato' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
    
    await contract.update(req.body);
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: 'Erro ao atualizar contrato' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const contract = await Contract.findByPk(req.params.id);
    if (!contract) return res.status(404).json({ error: 'Contrato não encontrado' });
    
    await contract.destroy();
    res.json({ message: 'Contrato deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar contrato' });
  }
});

// ==========================================
// 2. HANDLER DE PDF (Espelho exato do contract_handler.go)
// ==========================================

// Equivalente ao: func AnalyzePDF(c *gin.Context)
router.post('/analyze-pdf', upload.single('file'), async (req, res) => {
  try {
    // 1. Recebe o ficheiro pelo nome "file" definido no React
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo não recebido' });
    }

    // 2 e 3. Abre o PDF e extrai o texto (pdfParse já faz a leitura do buffer direto)
    const pdfData = await pdfParse(req.file.buffer);
    const rawText = pdfData.text;

    // Verifica se a extração funcionou (PDF protegido ou imagem)
    if (!rawText || rawText.trim().length === 0) {
      // Retorna 200 OK com a string de erro específica, igual no Go
      return res.status(200).send("ERRO: Texto não extraído (PDF protegido ou imagem)");
    }

    // Envia o texto bruto para o React (c.String equivalente)
    // O res.send() do Express envia como text/html ou text/plain dependendo do conteúdo
    res.set('Content-Type', 'text/plain');
    res.status(200).send(rawText);

  } catch (error) {
    console.error("Erro no processamento do PDF:", error);
    res.status(500).json({ error: 'Erro ao processar PDF' });
  }
});

module.exports = router;