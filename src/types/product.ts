import { ObjectId } from 'mongodb';

export type CommissionType = 'percentage' | 'fixed';

export interface Product {
    _id?: ObjectId | string;
    id: string;
    name: string;
    slug: string;
    price: number;
    description?: string;
    imageUrl?: string;
    commissionType: CommissionType;
    commissionValue: number;
    isActive: boolean;
}
