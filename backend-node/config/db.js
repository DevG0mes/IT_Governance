// Arquivo: config/db.js
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
require('dotenv').config();

// 1. Conexão com o Banco de Dados
const sequelize = new Sequelize(
  process.env.DB_NAME, 
  process.env.DB_USER, 
  process.env.DB_PASS, 
  {
    host: process.env.DB_HOST, 
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: false, 
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 } 
  }
);

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
const EmployeeLicense = require('../Models/EmployeeLicense')(sequelize, DataTypes);
const AssetAssignment = require('../Models/AssetAssignment')(sequelize, DataTypes);

// ==========================================
// 3. RELACIONAMENTOS DO BANCO
// ==========================================

// Ligação Ativo -> Detalhes (Refletindo a coluna AssetId que criamos no DBeaver)
// 1. Ligação Ativo -> Detalhes (Hardware)
Asset.hasOne(AssetNotebook, { foreignKey: 'AssetId', as: 'Notebook' });
AssetNotebook.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetCelular, { foreignKey: 'AssetId', as: 'Celular' });
AssetCelular.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetChip, { foreignKey: 'AssetId', as: 'Chip' });
AssetChip.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetStarlink, { foreignKey: 'AssetId', as: 'Starlink' });
AssetStarlink.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

// 2. 🚨 A LIGAÇÃO QUE FALTAVA (Ativo <-> Colaborador) 🚨
// Isso resolve o erro "Employee is not associated to Asset"
Asset.belongsTo(Employee, { foreignKey: 'EmployeeId', targetKey: 'id', as: 'Employee' }); 
Employee.hasMany(Asset, { foreignKey: 'EmployeeId', sourceKey: 'id', as: 'Assets' });

// 3. Colaborador -> Histórico de Atribuições (Para contar os Hardwares na tela)
Employee.hasMany(AssetAssignment, { foreignKey: 'EmployeeId', as: 'AssetAssignments' });
AssetAssignment.belongsTo(Employee, { foreignKey: 'EmployeeId', as: 'Employee' });

Asset.hasMany(AssetAssignment, { foreignKey: 'AssetId', as: 'Assignments' });
AssetAssignment.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

// 4. Colaborador -> Licenças de Software (Para contar os Softwares na tela)
Employee.hasMany(EmployeeLicense, { foreignKey: 'employee_id', as: 'EmployeeLicenses' });
EmployeeLicense.belongsTo(Employee, { foreignKey: 'employee_id', as: 'Employee' });

License.hasMany(EmployeeLicense, { foreignKey: 'license_id', as: 'EmployeeLicenses' });
EmployeeLicense.belongsTo(License, { foreignKey: 'license_id', as: 'License' });

// ==========================================
// 4. Sincronização e Setup Inicial
// ==========================================
const connectDatabase = async () => {
  try {
    console.log('--- 📡 Tentando conectar ao banco: ' + process.env.DB_HOST);
    await sequelize.authenticate();
    console.log('✅ Conexão com o MySQL Hostinger estabelecida!');
    
    console.log('✅ Verificando usuário administrador...');
    const adminExists = await User.findOne({ where: { email: 'admin@psi.com.br' } });
    
    if (!adminExists) {
      console.log('🛠️ Criando usuário Root...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        nome: 'Administrador Root',
        email: 'admin@psi.com.br',
        senha: hashedPassword,
        cargo: 'Administrator',
        permissionsJSON: '{"dashboard":"edit","inventory":"edit","licenses":"edit","contracts":"edit","catalog":"edit","employees":"edit","maintenance":"edit","offboarding":"edit","export":"edit","import":"edit","admin":"edit"}'
      });
      console.log('✅ Usuário Root criado!');
    }
  } catch (error) {
    console.error('❌ ERRO NO BOOT DO BANCO:', error.message);
  }
};

// EXPORTAÇÃO COMPLETA
module.exports = { 
  sequelize, User, Employee, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular, 
  License, Contract, CatalogItem, AuditLog, EmployeeLicense, AssetAssignment, connectDatabase 
};