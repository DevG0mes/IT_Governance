module.exports = (sequelize, DataTypes) => {
  return sequelize.define('License', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome_software: { type: DataTypes.STRING, allowNull: false },
    chave_licenca: { type: DataTypes.STRING },
    quantidade: { type: DataTypes.INTEGER },
    data_expiracao: { type: DataTypes.DATEONLY }
  }, { tableName: 'licenses', timestamps: true });
};