module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Employee', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    nome: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    departamento: { type: DataTypes.STRING },
    cargo: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, defaultValue: 'Ativo' },
    data_admissao: { type: DataTypes.DATEONLY }
  }, { tableName: 'employees', timestamps: true });
};