module.exports = (sequelize, DataTypes) => {
    const EmployeeLicense = sequelize.define('EmployeeLicense', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        EmployeeId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        LicenseId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        assigned_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        tableName: 'employee_licenses', // O nome da tabela no seu DBeaver
        timestamps: false
    });

    return EmployeeLicense;
};