module.exports = (sequelize, DataTypes) => {
  const Asset = sequelize.define('Asset', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    asset_type: { 
      type: DataTypes.STRING 
    },
    status: { 
      type: DataTypes.STRING, 
      defaultValue: 'Disponível' 
    },
    observacao: { 
      type: DataTypes.TEXT 
    }
  }, { 
    tableName: 'assets', 
    timestamps: false 
  });

  // 🚀 ASSOCIAÇÕES (O segredo para a tela de Inventário carregar)
  Asset.associate = (models) => {
    // Relacionamento com Notebook
    Asset.hasOne(models.AssetNotebook, { 
      foreignKey: 'AssetId', 
      as: 'notebook' 
    });

    // Relacionamento com Celular
    Asset.hasOne(models.AssetCelular, { 
      foreignKey: 'AssetId', 
      as: 'celular' 
    });

    // Relacionamento com Chip
    Asset.hasOne(models.AssetChip, { 
      foreignKey: 'AssetId', 
      as: 'chip' 
    });

    // Relacionamento com Starlink
    Asset.hasOne(models.AssetStarlink, { 
      foreignKey: 'AssetId', 
      as: 'starlink' 
    });

    // Relacionamento com o Colaborador (Dono do ativo)
    Asset.belongsTo(models.Employee, { 
      foreignKey: 'EmployeeId', // Verifique se o nome da coluna no banco é exatamente este
      as: 'employee' 
    });
  };

  return Asset;
};