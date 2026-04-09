module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'FinopsMonthlySnapshot',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ym: {
        type: DataTypes.STRING(7),
        allowNull: false,
        unique: true,
      },
      generated_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      generated_by: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      locked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      data: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      tableName: 'finops_monthly_snapshots',
      timestamps: false,
    }
  );
};

