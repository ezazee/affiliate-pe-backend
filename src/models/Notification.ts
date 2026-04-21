import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';

export interface NotificationAttributes {
    id: string;
    _id?: any;
    userId: string;
    userEmail: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    url?: string;
    read: boolean;
    timestamp: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

interface NotificationCreationAttributes extends Optional<NotificationAttributes, 'id' | '_id' | 'read' | 'timestamp' | 'createdAt' | 'updatedAt'> {}

class Notification extends Model<NotificationAttributes, NotificationCreationAttributes> implements NotificationAttributes {
    public id!: string;
    public _id!: any;
    public userId!: string;
    public userEmail!: string;
    public title!: string;
    public message!: string;
    public type!: 'info' | 'success' | 'warning' | 'error';
    public url?: string;
    public read!: boolean;
    public timestamp!: Date;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Notification.init(
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
        userId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        userEmail: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        type: {
            type: DataTypes.ENUM('info', 'success', 'warning', 'error'),
            defaultValue: 'info',
        },
        url: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
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
        modelName: 'Notification',
        tableName: 'notifications',
        timestamps: true,
    }
);

export default Notification;
