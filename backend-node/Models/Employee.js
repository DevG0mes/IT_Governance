module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define('Employee', {
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
    // ⚠️ ATENÇÃO: Estas colunas abaixo são redundantes se usarmos a tabela de Assets.
    // O ideal é que o seu Frontend conte os itens da associação 'assets' abaixo.
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
    },
    offboarding_adm365: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0 
    },
    offboarding_license: { 
      type: DataTypes.INTEGER, 
      defaultValue: 0
    },
    offboarding_mega: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    offboarding_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, { 
    tableName: 'employees', 
    timestamps: false,
    underscored: false // Mantemos false para bater com o "EmployeeId" (PascalCase) que vimos no banco
  });

  // 🛡️ O CORAÇÃO DO RELACIONAMENTO (PONTO A PONTO)
  Employee.associate = (models) => {
    // Relacionamento Direto (Dono Atual)
    // Isso liga o Colaborador aos Ativos onde ele é o dono atual (coluna EmployeeId na tabela assets)
    Employee.hasMany(models.Asset, { 
      foreignKey: 'EmployeeId', 
      as: 'assets' 
    });

    // Relacionamento Histórico (Atribuições)
    // Isso liga o Colaborador a todas as linhas da tabela de vínculo (asset_assignments)
    Employee.hasMany(models.AssetAssignment, { 
      foreignKey: 'employee_id', 
      as: 'assignments' 
    });
  };

  return Employee;
};