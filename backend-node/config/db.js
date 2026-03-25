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
    host: process.env.DB_HOST, // 🚨 Verifique se no .env isso não é 'localhost'
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
    logging: false, 
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 } // Ajuda na estabilidade da Hostinger
  }
);

// 2. Importação dos Models (Verifique se os nomes das pastas/arquivos batem EXATAMENTE)
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

// ==========================================
// 3. RELACIONAMENTOS (As "amarras" do banco)
// ==========================================
Asset.hasOne(AssetNotebook, { foreignKey: 'AssetId', as: 'Notebook', onDelete: 'CASCADE' });
AssetNotebook.belongsTo(Asset, { foreignKey: 'AssetId' });

Asset.hasOne(AssetStarlink, { foreignKey: 'AssetId', as: 'Starlink', onDelete: 'CASCADE' });
AssetStarlink.belongsTo(Asset, { foreignKey: 'AssetId' });

Asset.hasOne(AssetChip, { foreignKey: 'AssetId', as: 'Chip', onDelete: 'CASCADE' });
AssetChip.belongsTo(Asset, { foreignKey: 'AssetId' });

Asset.hasOne(AssetCelular, { foreignKey: 'AssetId', as: 'Celular', onDelete: 'CASCADE' });
AssetCelular.belongsTo(Asset, { foreignKey: 'AssetId' });

// ==========================================
// 4. Sincronização e Setup Inicial
// ==========================================
const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexão com o MySQL Hostinger estabelecida!');

    // 🚨 CUIDADO: sync() sem parâmetros é seguro, mas certifique-se que as tabelas já existem
    await sequelize.sync(); 
    console.log('✅ Tabelas sincronizadas!');

    // Criação do Admin Root (Sua lógica original perfeita)
    const adminExists = await User.findOne({ where: { email: 'admin@psi.com.br' } });
    if (!adminExists) {
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
    console.error('❌ ERRO NO BANCO:', error.message);
    // Removemos o process.exit(1) para o servidor não "desmaiar" e podermos ver o erro no Log
  }
};

module.exports = { 
  sequelize, User, Employee, Asset, AssetNotebook, AssetStarlink, AssetChip, AssetCelular, 
  License, Contract, CatalogItem, AuditLog, connectDatabase 
};