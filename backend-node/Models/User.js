module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    nome: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    email: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true 
    },
    senha: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    cargo: { 
      type: DataTypes.STRING 
    },
    permissionsJSON: { 
      type: DataTypes.TEXT 
    },
    profile_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    must_change_password: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, { 
    tableName: 'users', 
    timestamps: false 
  });
};