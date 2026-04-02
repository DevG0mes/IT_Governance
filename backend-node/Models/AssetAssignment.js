module.exports = (sequelize, DataTypes) => {
    const AssetAssignment = sequelize.define('AssetAssignment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // Mantemos o nome JS em PascalCase (compatível com controllers/associações),
        // mapeando para as colunas físicas snake_case.
        AssetId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'asset_id'
        },
        EmployeeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id'
        },
        assigned_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            field: 'assigned_at'
        },
        returned_at: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'returned_at'
        }
    }, {
        tableName: 'asset_assignments',
        timestamps: false,
        underscored: false
    });

    return AssetAssignment;
};