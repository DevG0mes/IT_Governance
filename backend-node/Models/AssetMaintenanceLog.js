module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'AssetMaintenanceLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      AssetId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      chamado: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      observacao: {
        type: DataTypes.TEXT,
      },
      opened_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      resolved_at: {
        type: DataTypes.DATE,
      },
      created_by: {
        type: DataTypes.STRING,
      },
    },
    {
      tableName: 'asset_maintenance_logs',
      timestamps: false,
    }
  );
};

