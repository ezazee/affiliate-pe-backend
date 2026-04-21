import { Model, DataTypes, Optional } from 'sequelize';
import db from '../config/database';

export interface SettingAttributes {
    id: string;
    name: string;
    value: any;
    createdAt?: Date;
    updatedAt?: Date;
}

interface SettingCreationAttributes extends Optional<SettingAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Setting extends Model<SettingAttributes, SettingCreationAttributes> implements SettingAttributes {
    public id!: string;
    public name!: string;
    public value!: any;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Setting.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    value: {
        type: DataTypes.JSONB,
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
}, {
    sequelize: db,
    modelName: 'Setting',
    tableName: 'settings',
    timestamps: true,
});

export default Setting;
