import { ObjectId } from 'mongodb';
import { Product } from './product';

export interface AffiliateLink {
    _id?: ObjectId | string;
    id?: string;
    affiliatorId: string;
    productId: string;
    isActive: boolean;
    clicks?: number;
    product?: Product;
}
