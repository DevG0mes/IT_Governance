module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AssetCelular', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    // FK 1:1 com assets (necessário para inserts via controller)
    AssetId: {
      type: DataTypes.INTEGER,
      allowNull: false
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
    },
    data_aquisicao: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    valor_compra: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },
  }, { 
    tableName: 'asset_celulares', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};