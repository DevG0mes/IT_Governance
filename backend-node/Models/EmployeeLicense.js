module.exports = (sequelize, DataTypes) => {
    const EmployeeLicense = sequelize.define('EmployeeLicense', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        license_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        assigned_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'employee_licenses', // O nome da tabela no seu DBeaver
        timestamps: true, // 🚨 ATIVADO: Permite que o Sequelize gerencie as datas
        paranoid: true,
        createdAt: 'created_at', // Mapeando o nome exato do banco
        updatedAt: 'updated_at',
        deletedAt: 'deleted_at'

    });

    return EmployeeLicense;
};