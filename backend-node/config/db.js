// Arquivo: config/db.js
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
require('dotenv').config(); // ✅ ADICIONADO: Garante a leitura do arquivo .env

console.log('--- 📡 Tentando conectar ao banco de dados PostgreSQL...');

// 1. Inicialização do Sequelize lendo as variáveis separadas do nosso .env
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false, // Mantido false para não poluir o terminal
  }
);

// 2. Importação dos Models (Passando sequelize e DataTypes corretamente)
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

// 1. Ligação Ativo -> Detalhes (Hardware)
Asset.hasOne(AssetNotebook, { foreignKey: 'AssetId', as: 'Notebook' });
AssetNotebook.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetCelular, { foreignKey: 'AssetId', as: 'Celular' });
AssetCelular.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetChip, { foreignKey: 'AssetId', as: 'Chip' });
AssetChip.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

Asset.hasOne(AssetStarlink, { foreignKey: 'AssetId', as: 'Starlink' });
AssetStarlink.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

// 2. Ligação Ativo <-> Colaborador
Asset.belongsTo(Employee, { foreignKey: 'EmployeeId', targetKey: 'id', as: 'Employee' }); 
Employee.hasMany(Asset, { foreignKey: 'EmployeeId', sourceKey: 'id', as: 'Assets' });

// 3. Colaborador -> Histórico de Atribuições
Employee.hasMany(AssetAssignment, { foreignKey: 'EmployeeId', as: 'AssetAssignments' });
AssetAssignment.belongsTo(Employee, { foreignKey: 'EmployeeId', as: 'Employee' });

Asset.hasMany(AssetAssignment, { foreignKey: 'AssetId', as: 'Assignments' });
AssetAssignment.belongsTo(Asset, { foreignKey: 'AssetId', as: 'Asset' });

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
    console.log('✅ Conexão com o PostgreSQL AWS estabelecida com sucesso!');
    
    // ✅ ADICIONADO: Sincroniza (cria) as tabelas no Postgres ANTES de procurar o admin
    console.log('🔄 Sincronizando estrutura das tabelas...');
    await sequelize.sync({ alter: true }); // O 'alter' ajusta o banco sem apagar dados
    console.log('✅ Estrutura do banco de dados atualizada!');

    console.log('✅ Verificando usuário administrador...');
    // Verificamos o e-mail oficial da PSI Energy
    const adminExists = await User.findOne({ where: { email: 'admin@psienergy.com.br' } });
    
    if (!adminExists) {
      console.log('🛠️ Criando usuário Administrador da PSI Energy...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        nome: 'Administrador TI',
        email: 'admin@psienergy.com.br',
        senha: hashedPassword,
        cargo: 'Administrator',
        permissionsJSON: '{"dashboard":"edit","inventory":"edit","licenses":"edit","contracts":"edit","catalog":"edit","employees":"edit","maintenance":"edit","offboarding":"edit","export":"edit","import":"edit","admin":"edit"}'
      });
      console.log('✅ Usuário Administrador criado!');
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