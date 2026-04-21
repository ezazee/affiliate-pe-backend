import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
import { Product as ProductAttributes, CommissionType } from '../types/product';

interface ProductCreationAttributes extends Optional<ProductAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'> {}

class Product extends Model<ProductAttributes, ProductCreationAttributes> implements ProductAttributes {
    public _id!: any;
    public id!: string;
    public name!: string;
    public slug!: string;
    public price!: number;
    public description?: string;
    public imageUrl?: string;
    public commissionType!: CommissionType;
    public commissionValue!: number;
    public weight!: number;
    public isActive!: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

Product.init(
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
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        slug: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        price: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        commissionType: {
            type: DataTypes.ENUM('percentage', 'fixed'),
            allowNull: false,
        },
        commissionValue: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: false,
        },
        weight: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 500,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
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
        modelName: 'Product',
        tableName: 'products',
        timestamps: true,
    }
);

export default Product;
