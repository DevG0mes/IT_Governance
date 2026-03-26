module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    table_name: { 
      type: DataTypes.STRING 
    },
    action: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    record_id: { 
      type: DataTypes.INTEGER 
    },
    old_data: { 
      type: DataTypes.TEXT // TEXT é mais seguro aqui para evitar problemas de codificação do JSON
    },
    new_data: { 
      type: DataTypes.TEXT 
    },
    changed_at: { 
      type: DataTypes.DATE 
    },
    timestamp: { 
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    user: { 
      type: DataTypes.STRING 
    },
    module: { 
      type: DataTypes.STRING 
    },
    details: { 
      type: DataTypes.TEXT 
    }
  }, { 
    tableName: 'audit_logs', 
    timestamps: false // Deixamos false porque já mapeamos 'changed_at' e 'timestamp' manualmente acima
  });

  return AuditLog;
};