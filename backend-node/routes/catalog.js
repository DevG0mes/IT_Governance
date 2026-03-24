// Arquivo: routes/catalog.js
const express = require('express');
const { CatalogItem } = require('../config/db');

const router = express.Router();

// ==========================================
// GET: Buscar todos os itens do catálogo
// ==========================================
router.get('/', async (req, res) => {
  try {
    const items = await CatalogItem.findAll();
    // Embrulhando no "data" igualzinho ao gin.H{"data": items}
    res.status(200).json({ data: items });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar itens do catálogo' });
  }
});

// ==========================================
// POST: Criar novo item no catálogo
// ==========================================
router.post('/', async (req, res) => {
  try {
    // No Go você retornava StatusOK (200) ao invés de StatusCreated (201), mantive o padrão
    const novoItem = await CatalogItem.create(req.body);
    res.status(200).json({ data: novoItem });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao cadastrar item no catálogo' });
  }
});

// ==========================================
// PUT: Atualizar item existente
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const item = await CatalogItem.findByPk(req.params.id);
    
    // Verificação exata do Go
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }
    
    await item.update(req.body);
    res.status(200).json({ data: item });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao atualizar item do catálogo' });
  }
});

// ==========================================
// DELETE: Excluir item do catálogo
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    // O Go faz o delete direto usando o ID
    await CatalogItem.destroy({ where: { id: req.params.id } });
    
    // Mensagem idêntica ao gin.H{"message": "Item deletado"}
    res.status(200).json({ message: 'Item deletado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar item do catálogo' });
  }
});

module.exports = router;