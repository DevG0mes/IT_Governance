module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Contract', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    servico: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    fornecedor: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    mes_competencia: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    valor_previsto: { 
      type: DataTypes.FLOAT 
    },
    valor_realizado: { 
      type: DataTypes.FLOAT 
    },
    url_contrato: { 
      type: DataTypes.STRING 
    },
    
  }, { 
    tableName: 'contracts', 
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
};