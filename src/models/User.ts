import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
import { User as UserAttributes, UserRole, UserStatus, PushSubscription } from '../types/user';
import { BankDetails } from '../types/withdrawal';

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt' | 'referralCode' | 'registrationNumber'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
    public _id!: any; // Keeping for compatibility during migration, but will use 'id'
    public id!: string;
    public name!: string;
    public email!: string;
    public password?: string;
    public role!: UserRole;
    public status!: UserStatus;
    public phone?: string;
    public referralCode?: string;
    public registrationNumber?: string;
    public bankDetails?: BankDetails;
    public pushSubscription?: PushSubscription | null;
    public notificationsEnabled?: boolean;
    public resetPasswordToken?: string | null;
    public resetPasswordExpires?: Date | null;
    public storeName?: string;
    public storeSlug?: string;
    public storeBio?: string;
    public storeThemeColor?: string;
    public storeSocialLinks?: any;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

User.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        _id: {
            type: DataTypes.STRING, // Store original Mongo ID during migration if needed
            allowNull: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
        },
        password: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        role: {
            type: DataTypes.ENUM('admin', 'affiliator'),
            defaultValue: 'affiliator',
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
            defaultValue: 'pending',
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        referralCode: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        registrationNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bankDetails: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        pushSubscription: {
            type: DataTypes.JSONB,
            allowNull: true,
        },
        notificationsEnabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        resetPasswordToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        resetPasswordExpires: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        storeName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        storeSlug: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        storeBio: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        storeThemeColor: {
            type: DataTypes.STRING,
            defaultValue: '#000000',
        },
        storeSocialLinks: {
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
    },
    {
        sequelize: db,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
    }
);

export default User;
