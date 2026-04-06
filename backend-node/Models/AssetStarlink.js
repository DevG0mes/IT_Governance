module.exports = (sequelize, DataTypes) => {
  const AssetStarlink = sequelize.define('AssetStarlink', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    AssetId: {
      type: DataTypes.INTEGER,
      allowNull: false // É obrigatório ter um pai (o Ativo principal)
      // Não precisamos do bloco 'references' aqui porque o config/db.js já faz essa amarração!
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
    },
    projeto: { 
      type: DataTypes.STRING 
    },
    email_responsavel: {
      type: DataTypes.STRING
    },
    data_aquisicao: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  }, { 
    tableName: 'asset_starlinks', 
    timestamps: false // 🚨 O print confirma que não há created_at nem updated_at aqui, então está certinho!
  });

  return AssetStarlink;
};