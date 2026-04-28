import { DataTypes, Model, Optional } from 'sequelize';
import db from '../config/database';
import { Order as OrderAttributes, OrderStatus } from '../types/order';

interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | '_id' | 'createdAt' | 'updatedAt'> {}

class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
    public _id!: any;
    public id!: string;
    public orderNumber?: string;
    public paymentToken?: string;
    public paymentTokenExpiresAt?: Date;
    public isPaymentUsed?: boolean;
    public buyerName!: string;
    public buyerPhone!: string;
    public buyerEmail!: string;
    public shippingAddress!: string;
    public district?: string;
    public city!: string;
    public province!: string;
    public postalCode!: string;
    public productId!: string;
    public quantity!: number;
    public affiliatorId!: string;
    public affiliateCode!: string;
    public affiliateName!: string;
    public status!: OrderStatus;
    public destinationAreaId?: string;
    public destinationLat?: number;
    public destinationLng?: number;
    public courierName?: string;
    public courierService?: string;
    public trackingNumber?: string;
    public trackingUrl?: string;
    public biteshipShipmentId?: string;
    public biteshipTrackingStatus?: string;
    public shippingCost?: number;
    public totalPrice?: number;
    public commission?: number;
    public commissionRate?: number;
    public orderNote?: string;
    public paymentProof?: string;
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
    public productName?: string;
    public productPrice?: number;
    public commissionType?: string;
    public commissionValue?: number;
    public activityLog?: any[];
}

Order.init(
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
        orderNumber: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },
        paymentToken: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        paymentTokenExpiresAt: {
            type: DataTypes.DATE,
            allowNull: true,
        },
        isPaymentUsed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        buyerName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        buyerPhone: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        buyerEmail: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'customer@peskinpro.id',
        },
        shippingAddress: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        district: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        city: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        province: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        postalCode: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        productId: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
        },
        affiliatorId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        affiliateCode: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        affiliateName: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        status: {
            type: DataTypes.ENUM('pending', 'paid', 'cancelled', 'shipping', 'delivered'),
            defaultValue: 'pending',
        },
        destinationAreaId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        destinationLat: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
        },
        destinationLng: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
        },
        courierName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        courierService: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        trackingNumber: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        trackingUrl: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        biteshipShipmentId: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        biteshipTrackingStatus: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        shippingCost: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
        },
        totalPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
        },
        commission: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
        },
        commissionRate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
        orderNote: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        paymentProof: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        productName: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        productPrice: {
            type: DataTypes.DECIMAL(15, 2),
            allowNull: true,
        },
        commissionType: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        commissionValue: {
            type: DataTypes.DECIMAL(15, 2),
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
        activityLog: {
            type: DataTypes.JSONB,
            allowNull: true,
            defaultValue: [],
        },
    },
    {
        sequelize: db,
        modelName: 'Order',
        tableName: 'orders',
        timestamps: true,
    }
);

export default Order;
