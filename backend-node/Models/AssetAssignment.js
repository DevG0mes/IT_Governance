module.exports = (sequelize, DataTypes) => {
    const AssetAssignment = sequelize.define('AssetAssignment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        AssetId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        EmployeeId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        assigned_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        returned_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        tableName: 'asset_assignments', // O nome da tabela no seu DBeaver
        timestamps: false
    });

    return AssetAssignment;
};