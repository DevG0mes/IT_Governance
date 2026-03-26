module.exports = (sequelize, DataTypes) => {
  return sequelize.define('License', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    nome: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    fornecedor: { 
      type: DataTypes.STRING 
    },
    plano: { 
      type: DataTypes.STRING 
    },
    custo: { 
      type: DataTypes.DECIMAL(10, 2) // Usamos DECIMAL para valores financeiros (moeda)
    },
    quantidade_total: { 
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    quantidade_em_uso: { 
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    data_renovacao: { 
      type: DataTypes.DATEONLY 
    }
  }, { 
    tableName: 'licenses', 
    timestamps: true, // 🚨 Reativamos para o Sequelize preencher as datas sozinho
    createdAt: 'created_at', // Mapeando o nome exato do banco
    updatedAt: 'updated_at'  // Mapeando o nome exato do banco
  });
};