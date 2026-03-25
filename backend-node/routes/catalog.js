// Arquivo: routes/catalog.js
const express = require('express');
const router = express.Router();
// ✅ Importação correta centralizada no db.js
const { CatalogItem } = require('../config/db');

// ==========================================
// GET: Buscar todos os itens do catálogo
// ==========================================
router.get('/', async (req, res) => {
  try {
    const items = await CatalogItem.findAll();
    // Embrulhando no "data" igualzinho ao seu backend em Go
    return res.status(200).json({ data: items });
  } catch (error) {
    console.error("❌ Erro no Catálogo (GET):", error.message);
    return res.status(500).json({ error: 'Erro ao buscar itens do catálogo' });
  }
});

// ==========================================
// POST: Criar novo item no catálogo
// ==========================================
router.post('/', async (req, res) => {
  try {
    // No Go você retornava StatusOK (200), mantivemos o padrão para o Frontend não estranhar
    const novoItem = await CatalogItem.create(req.body);
    return res.status(200).json({ data: novoItem });
  } catch (error) {
    console.error("❌ Erro no Catálogo (POST):", error.message);
    return res.status(400).json({ error: 'Erro ao cadastrar item no catálogo' });
  }
});

// ==========================================
// PUT: Atualizar item existente
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const item = await CatalogItem.findByPk(req.params.id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado no catálogo' });
    }
    
    await item.update(req.body);
    return res.status(200).json({ data: item });
  } catch (error) {
    console.error("❌ Erro no Catálogo (PUT):", error.message);
    return res.status(400).json({ error: 'Erro ao atualizar item do catálogo' });
  }
});

// ==========================================
// DELETE: Excluir item do catálogo
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await CatalogItem.destroy({ where: { id: req.params.id } });
    
    if (deleted === 0) {
      return res.status(404).json({ error: 'Item não encontrado para exclusão' });
    }
    
    return res.status(200).json({ message: 'Item deletado' });
  } catch (error) {
    console.error("❌ Erro no Catálogo (DELETE):", error.message);
    return res.status(500).json({ error: 'Erro ao deletar item do catálogo' });
  }
});

module.exports = router;