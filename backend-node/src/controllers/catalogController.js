const { CatalogItem } = require('../../config/db');

exports.getAll = async (req, res) => {
  try {
    const items = await CatalogItem.findAll({ 
      order: [['category', 'ASC'], ['nome', 'ASC']] 
    });
    return res.status(200).json({ data: items });
  } catch (error) {
    console.error("❌ Erro no Catálogo (GET):", error.message);
    return res.status(500).json({ error: 'Erro ao buscar itens do catálogo' });
  }
};

exports.create = async (req, res) => {
  try {
    const { category, nome } = req.body;

    // 🛡️ TRAVA ANTI-DUPLICAÇÃO: Impede o mesmo item na mesma categoria
    const existing = await CatalogItem.findOne({ 
      where: { 
        category: category, 
        nome: nome.trim() 
      } 
    });

    if (existing) {
      return res.status(400).json({ 
        error: `O item '${nome}' já existe na categoria '${category}'.` 
      });
    }

    const novoItem = await CatalogItem.create({
      ...req.body,
      nome: nome.trim()
    });
    
    return res.status(201).json({ data: novoItem });
  } catch (error) {
    console.error("❌ Erro no Catálogo (POST):", error.message);
    return res.status(400).json({ error: 'Erro ao cadastrar item no catálogo' });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const item = await CatalogItem.findByPk(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado no catálogo' });
    }
    
    await item.update(req.body);
    return res.status(200).json({ data: item });
  } catch (error) {
    console.error("❌ Erro no Catálogo (PUT):", error.message);
    return res.status(400).json({ error: 'Erro ao atualizar item do catálogo' });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CatalogItem.destroy({ where: { id } });
    
    if (deleted === 0) {
      return res.status(404).json({ error: 'Item não encontrado para exclusão' });
    }
    
    return res.status(200).json({ message: 'Item deletado com sucesso' });
  } catch (error) {
    console.error("❌ Erro no Catálogo (DELETE):", error.message);
    return res.status(500).json({ error: 'Erro ao deletar item do catálogo' });
  }
};