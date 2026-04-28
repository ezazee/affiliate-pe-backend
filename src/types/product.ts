export type CommissionType = 'percentage' | 'fixed';

export interface Product {
    _id?: any;
    id: string;
    sku: string;
    name: string;
    slug: string;
    price: number;
    description?: string;
    imageUrl?: string;
    commissionType: CommissionType;
    commissionValue: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    type?: 'single' | 'bundle';
    stock?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
