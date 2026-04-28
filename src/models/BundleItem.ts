import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
import Product from './Product';

interface BundleItemAttributes {
    id: string;
    bundleProductId: string;
    componentProductId: string;
    quantity: number;
    createdAt?: Date;
    updatedAt?: Date;
}

interface BundleItemCreationAttributes extends Optional<BundleItemAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class BundleItem extends Model<BundleItemAttributes, BundleItemCreationAttributes> implements BundleItemAttributes {
    public id!: string;
    public bundleProductId!: string;
    public componentProductId!: string;
    public quantity!: number;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

BundleItem.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        bundleProductId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'products', key: 'id' },
        },
        componentProductId: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: 'products', key: 'id' },
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
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
        modelName: 'BundleItem',
        tableName: 'bundle_items',
        timestamps: true,
    }
);

export default BundleItem;
