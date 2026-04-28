import { Product } from './product';

export type OrderStatus = 'pending' | 'paid' | 'cancelled' | 'shipping' | 'delivered';

export interface Order {
    _id?: any;
    id?: string;
    orderNumber?: string;
    paymentToken?: string;
    paymentTokenExpiresAt?: Date;
    isPaymentUsed?: boolean; // New field for single-use functionality
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    shippingAddress: string;
    district?: string;
    city: string;
    province: string;
    postalCode: string;
    productId: string;
    quantity: number;
    affiliatorId: string;
    affiliateCode: string;
    affiliateName: string;
    status: OrderStatus;
    destinationAreaId?: string;
    destinationLat?: number;
    destinationLng?: number;
    courierName?: string;
    courierService?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    biteshipShipmentId?: string;
    biteshipTrackingStatus?: string;
    shippingCost?: number;
    totalPrice?: number;
    commission?: number;
    commissionRate?: number;
    orderNote?: string;
    paymentProof?: string;
    createdAt: Date;
    updatedAt: Date;
    product?: Product;
    productName?: string;
    productPrice?: number;
    commissionType?: string;
    commissionValue?: number;
    activityLog?: {
        status: string;
        timestamp: Date;
        note: string;
    }[];
}
