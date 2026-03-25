module.exports = (sequelize, DataTypes) => {
  return sequelize.define('CatalogItem', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    nome: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    categoria: { 
      type: DataTypes.STRING 
    }
  }, { 
    tableName: 'catalog_items', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};