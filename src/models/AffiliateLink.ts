import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
import { AffiliateLink as AffiliateLinkAttributes } from '../types/affiliateLink';

interface AffiliateLinkCreationAttributes extends Optional<AffiliateLinkAttributes, 'id' | '_id' | 'clicks' | 'createdAt' | 'updatedAt'> {}

class AffiliateLink extends Model<AffiliateLinkAttributes, AffiliateLinkCreationAttributes> implements AffiliateLinkAttributes {
    public _id!: any;
    public id!: string;
    public affiliatorId!: string;
    public productId!: string;
    public isActive!: boolean;
    public clicks!: number;
    public showInStore?: boolean;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

AffiliateLink.init(
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
        productId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        clicks: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
        },
        showInStore: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
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
        modelName: 'AffiliateLink',
        tableName: 'affiliate_links',
        timestamps: true,
    }
);

export default AffiliateLink;
