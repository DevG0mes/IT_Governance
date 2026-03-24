module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Asset', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    asset_type: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Disponível' },
    observacao: { type: DataTypes.TEXT }
  }, { tableName: 'assets', timestamps: true });
};