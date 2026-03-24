module.exports = (sequelize, DataTypes) => {
  return sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_email: { type: DataTypes.STRING },
    action: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT },
    ip_address: { type: DataTypes.STRING }
  }, { tableName: 'audit_logs', timestamps: true });
};