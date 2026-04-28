import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

export type StockLogType = 'in' | 'out' | 'adjustment' | 'sale' | 'return';

class StockLog extends Model {
    public id!: string;
    public productId!: string;
    public type!: StockLogType;
    public quantity!: number;
    public previousStock!: number;
    public newStock!: number;
    public note!: string | null;
    public picName!: string | null;
    public picId!: string | null;
    public referenceId!: string | null;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

StockLog.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    productId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('in', 'out', 'adjustment', 'sale', 'return'),
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    previousStock: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    newStock: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    note: {
        type: DataTypes.STRING,
        allowNull: true
    },
    picName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    picId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    referenceId: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'StockLog',
    tableName: 'StockLogs'
});

export default StockLog;
