module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AssetNotebook', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    serial_number: { 
      type: DataTypes.STRING 
    },
    patrimonio: { 
      type: DataTypes.STRING 
    },
    modelo: { 
      type: DataTypes.STRING 
    },
    garantia: { 
      type: DataTypes.STRING 
    },
    status_garantia: { 
      type: DataTypes.STRING 
    }
  }, { 
    tableName: 'asset_notebooks', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};