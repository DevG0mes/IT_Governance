module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Employee', {
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
    departamento: { 
      type: DataTypes.STRING 
    },
    notebook: { 
      type: DataTypes.STRING 
    },
    chip: { 
      type: DataTypes.STRING 
    },
    status: { 
      type: DataTypes.STRING, 
      defaultValue: 'Ativo' 
    },
    termo_url: { 
      type: DataTypes.STRING 
    },
    offboarding_onfly: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    }
  }, { 
    tableName: 'employees', 
    timestamps: false // 🚨 DESLIGADO: Impede o erro do createdAt/updatedAt 🚨
  });
};