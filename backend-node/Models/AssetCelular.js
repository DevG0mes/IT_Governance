module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AssetCelular', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    imei: { 
      type: DataTypes.STRING 
    },
    modelo: { 
      type: DataTypes.STRING 
    },
    grupo: { 
      type: DataTypes.STRING 
    },
    responsavel: { 
      type: DataTypes.STRING 
    }
  }, { 
    tableName: 'asset_celulares', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};