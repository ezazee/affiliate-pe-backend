import { Product } from './product';

export interface AffiliateLink {
    _id?: any;
    id?: string;
    affiliatorId: string;
    productId: string;
    isActive: boolean;
    clicks?: number;
    showInStore?: boolean;
    createdAt: Date;
    updatedAt: Date;
    product?: Product;
}
