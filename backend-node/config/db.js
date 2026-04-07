// Arquivo: config/db.js
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Banco oficial atual: PostgreSQL (instância dedicada).
// Mantemos override por env caso precise rodar em outro dialeto localmente.
const DB_DIALECT = (process.env.DB_DIALECT || 'postgres').toLowerCase();
const DB_PORT_DEFAULT = DB_DIALECT === 'postgres' ? 5432 : 3306;

console.log(`--- 📡 Tentando conectar ao banco de dados (${DB_DIALECT})...`);

// 1. Inicialização do Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || DB_PORT_DEFAULT,
  dialect: DB_DIALECT,
  logging: false,
  define: {
    // Mantém o padrão do projeto (campos existentes são em snake_case/pt-br misto)
    freezeTableName: true,
  },
});

// 2. Importação dos Models
const User = require('../Models/User')(sequelize, DataTypes);
const AuditLog = require('../Models/Audit')(sequelize, DataTypes);
const CatalogItem = require('../Models/Catalog')(sequelize, DataTypes);
const Employee = require('../Models/Employee')(sequelize, DataTypes);
const License = require('../Models/License')(sequelize, DataTypes);
const Contract = require('../Models/Contract')(sequelize, DataTypes);
const Asset = require('../Models/Asset')(sequelize, DataTypes);
const AssetNotebook = require('../Models/AssetNotebook')(sequelize, DataTypes);
const AssetStarlink = require('../Models/AssetStarlink')(sequelize, DataTypes);
const AssetChip = require('../Models/AssetChip')(sequelize, DataTypes);
const AssetCelular = require('../Models/AssetCelular')(sequelize, DataTypes);
const AssetMaintenanceLog = require('../Models/AssetMaintenanceLog')(sequelize, DataTypes);
const EmployeeLicense = require('../Models/EmployeeLicense')(sequelize, DataTypes);
const AssetAssignment = require('../Models/AssetAssignment')(sequelize, DataTypes);
const AccessProfile = require('../Models/AccessProfile')(sequelize, DataTypes);

User.belongsTo(AccessProfile, { foreignKey: 'profile_id', as: 'AccessProfile' });
AccessProfile.hasMany(User, { foreignKey: 'profile_id', as: 'Users' });

// ==========================================
// 3. RELACIONAMENTOS DO BANCO
// ==========================================

// 1. Ligação Ativo -> Detalhes (Hardware)
Asset.hasOne(AssetNotebook, { foreignKey: 'AssetId', as: 'Notebook' });
AssetNotebook.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetCelular, { foreignKey: 'AssetId', as: 'Celular' });
AssetCelular.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetChip, { foreignKey: 'AssetId', as: 'Chip' });
AssetChip.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetStarlink, { foreignKey: 'AssetId', as: 'Starlink' });
AssetStarlink.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

// 2. Ligação Ativo <-> Colaborador (dono atual)
Asset.belongsTo(Employee, { foreignKey: 'EmployeeId', targetKey: 'id', as: 'Employee' });
Employee.hasMany(Asset, { foreignKey: 'EmployeeId', sourceKey: 'id', as: 'Assets' });

// 3. Colaborador -> Histórico de Atribuições (tabela pivô)
Employee.hasMany(AssetAssignment, { foreignKey: 'EmployeeId', as: 'AssetAssignments' });
AssetAssignment.belongsTo(Employee, { foreignKey: 'EmployeeId', as: 'Employee' });

// Importante: o frontend usa AssetAssignments/assignments como fallback.
// Padronizamos o alias do lado do Asset para 'AssetAssignments'.
Asset.hasMany(AssetAssignment, { foreignKey: 'AssetId', as: 'AssetAssignments' });
AssetAssignment.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

// 3.1 Logs de manutenção (histórico)
Asset.hasMany(AssetMaintenanceLog, { foreignKey: 'AssetId', as: 'maintenance_logs' });
AssetMaintenanceLog.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

// 4. Colaborador -> Licenças de Software
Employee.hasMany(EmployeeLicense, { foreignKey: 'employee_id', as: 'EmployeeLicenses' });
EmployeeLicense.belongsTo(Employee, { foreignKey: 'employee_id', as: 'Employee' });

License.hasMany(EmployeeLicense, { foreignKey: 'license_id', as: 'EmployeeLicenses' });
EmployeeLicense.belongsTo(License, { foreignKey: 'license_id', as: 'License' });

// ==========================================
// 4. Sincronização e Setup Inicial
// ==========================================
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ Conexão com o banco (${DB_DIALECT}) estabelecida com sucesso!`);
    
    console.log('🔄 Sincronizando estrutura das tabelas...');
    // 🚨 Governança: alter pode causar mudanças inesperadas em produção.
    // Use `DB_SYNC_ALTER=true` apenas em ambientes controlados.
    const shouldAlter = String(process.env.DB_SYNC_ALTER || '').toLowerCase() === 'true';
    await sequelize.sync({ alter: shouldAlter });
    console.log('✅ Estrutura do banco de dados SINCRONIZADA com sucesso!');

    // Verifica se o admin já existe para evitar erros de duplicidade
    const adminExists = await User.findOne({ where: { email: 'admin@psienergy.com.br' } });

    if (!adminExists) {
      console.log('⚙️ Criando usuário administrador inicial...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        nome: 'Administrador TI',
        email: 'admin@psienergy.com.br',
        senha: hashedPassword,
        cargo: 'Administrator',
        permissionsJSON: JSON.stringify({
          dashboard: "edit",
          inventory: "edit",
          licenses: "edit",
          contracts: "edit",
          catalog: "edit",
          employees: "edit",
          maintenance: "edit",
          offboarding: "edit",
          export: "edit",
          import: "edit",
          admin: "edit",
          settings: "edit"
        })
      });
      console.log('✅ Usuário Administrador [admin@psienergy.com.br] criado!');
    } else {
      console.log('✅ Usuário Administrador já existe no banco. Pulando criação.');
    }
    
  } catch (error) {
    console.error('❌ ERRO NO BOOT DO BANCO:', error);
  }
};

// EXPORTAÇÃO COMPLETA
module.exports = { 
  sequelize, User, Employee, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular, 
  License, Contract, CatalogItem, AuditLog, EmployeeLicense, AssetAssignment, AssetMaintenanceLog, AccessProfile, connectDatabase 
};