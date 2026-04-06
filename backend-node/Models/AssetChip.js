module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AssetChip', {
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
    numero: { 
      type: DataTypes.STRING 
    },
    plano: { 
      type: DataTypes.STRING 
    },
    iccid: { 
      type: DataTypes.STRING 
    },
    grupo: { 
      type: DataTypes.STRING 
    },
    responsavel: { 
      type: DataTypes.STRING 
    },
    vencimento_plano: {
      type: DataTypes.DATEONLY
    },
    data_aquisicao: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  }, { 
    tableName: 'asset_chips', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};