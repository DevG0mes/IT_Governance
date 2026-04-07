module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    'AccessProfile',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nome: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true,
      },
      permissionsJSON: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'access_profiles',
      timestamps: false,
    }
  );
};

