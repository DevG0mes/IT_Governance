module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AssetChip', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
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
    }
  }, { 
    tableName: 'asset_chips', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};