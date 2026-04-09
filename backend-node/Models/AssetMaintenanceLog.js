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
      custo_reparo: {
        type: DataTypes.DECIMAL(12, 2),
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

