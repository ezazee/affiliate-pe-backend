import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';

export interface LinkClickAttributes {
    id: string;
    linkId: string;
    createdAt: Date;
    updatedAt?: Date;
}

interface LinkClickCreationAttributes extends Optional<LinkClickAttributes, 'id' | 'createdAt'> {}

class LinkClick extends Model<LinkClickAttributes, LinkClickCreationAttributes> implements LinkClickAttributes {
    public id!: string;
    public linkId!: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

LinkClick.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        linkId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    },
    {
        sequelize: db,
        modelName: 'LinkClick',
        tableName: 'link_clicks',
        timestamps: true,
    }
);

export default LinkClick;
