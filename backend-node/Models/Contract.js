module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Contract', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    fornecedor: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    numero_contrato: { 
      type: DataTypes.STRING 
    },
    valor: { 
      type: DataTypes.FLOAT 
    },
    data_fim: { 
      type: DataTypes.DATEONLY 
    }
  }, { 
    tableName: 'contracts', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};