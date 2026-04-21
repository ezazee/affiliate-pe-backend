export type CommissionType = 'percentage' | 'fixed';

export interface Product {
    _id?: any;
    id: string;
    name: string;
    slug: string;
    price: number;
    description?: string;
    imageUrl?: string;
    commissionType: CommissionType;
    commissionValue: number;
    weight?: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
