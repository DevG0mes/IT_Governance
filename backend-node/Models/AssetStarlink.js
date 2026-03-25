module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AssetStarlink', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    modelo: { 
      type: DataTypes.STRING 
    },
    grupo: { 
      type: DataTypes.STRING 
    },
    localizacao: { 
      type: DataTypes.STRING 
    },
    responsavel: { 
      type: DataTypes.STRING 
    },
    email: { 
      type: DataTypes.STRING 
    },
    senha: { 
      type: DataTypes.STRING 
    },
    senha_roteador: { 
      type: DataTypes.STRING 
    }
  }, { 
    tableName: 'asset_starlinks', 
    timestamps: false // 🚨 CORRIGIDO: Desligando a busca por createdAt e updatedAt
  });
};