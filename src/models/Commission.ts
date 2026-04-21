import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
import { Commission as CommissionAttributes, CommissionStatus } from '../types/commission';

interface CommissionCreationAttributes extends Optional<CommissionAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'> {}

class Commission extends Model<CommissionAttributes, CommissionCreationAttributes> implements CommissionAttributes {
    public _id!: any;
    public id!: string;
    public affiliatorId!: string;
    public affiliateName!: string;
    public orderId!: string;
    public productName!: string;
    public amount!: number;
    public status!: CommissionStatus;
    public date!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public withdrawalId?: string;
    public usedAmount?: number;
    public isPartial?: boolean;
    public parentCommissionId?: string;
}

Commission.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        _id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        affiliatorId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        affiliateName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        orderId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        productName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'paid', 'cancelled', 'withdrawn', 'reserved', 'processed'),
            defaultValue: 'pending',
        },
        date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        withdrawalId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        usedAmount: {
            type: DataTypes.DECIMAL(15, 2),
            defaultValue: 0,
        },
        isPartial: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        parentCommissionId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize: db,
        modelName: 'Commission',
        tableName: 'commissions',
        timestamps: true,
    }
);

export default Commission;
