import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
import { Withdrawal as WithdrawalAttributes, WithdrawalStatus, BankDetails } from '../types/withdrawal';

interface WithdrawalCreationAttributes extends Optional<WithdrawalAttributes, 'id' | '_id' | 'requestedAt' | 'createdAt' | 'updatedAt'> {}

class Withdrawal extends Model<WithdrawalAttributes, WithdrawalCreationAttributes> implements WithdrawalAttributes {
    public _id!: any;
    public id!: string;
    public affiliatorId!: string;
    public amount!: number;
    public status!: WithdrawalStatus;
    public bankDetails!: BankDetails;
    public requestedAt!: Date;
    public processedAt?: Date;
    public transferProof?: string;
    public rejectionReason?: string;
    public activityLog?: any[];
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Withdrawal.init(
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
        amount: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
            defaultValue: 'pending',
        },
        bankDetails: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        requestedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        processedAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        rejectionReason: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        transferProof: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        activityLog: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
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
        modelName: 'Withdrawal',
        tableName: 'withdrawals',
        timestamps: true,
    }
);

export default Withdrawal;
