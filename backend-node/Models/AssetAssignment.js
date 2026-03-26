module.exports = (sequelize, DataTypes) => {
    const AssetAssignment = sequelize.define('AssetAssignment', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        // 🛡️ Ajustado para bater com a coluna real do banco (asset_id)
        asset_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'asset_id' // Mapeia o nome exato da coluna no SQL
        },
        // 🛡️ Ajustado para bater com a coluna real do banco (employee_id)
        employee_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'employee_id' // Mapeia o nome exato da coluna no SQL
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
        underscored: true // Força o Sequelize a usar snake_case por padrão
    });

    return AssetAssignment;
};