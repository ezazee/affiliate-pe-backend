import clientPromise from '../config/database';
import { Product, User, AffiliateLink } from '../types';
import { ObjectId } from 'mongodb';

export const getProductBySlug = async (slug: string): Promise<Product | null> => {
    const client = await clientPromise;
    const db = client.db();
    const product = await db.collection<Product>('products').findOne({ slug });
    if (product) {
        return { ...product, id: product._id.toString() };
    }
    return null;
};

export const getUserByReferralCode = async (referralCode: string): Promise<User | null> => {
    const client = await clientPromise;
    const db = client.db();
    const user = await db.collection<User>('users').findOne({ referralCode });
    if (user) {
        return { ...user, id: user._id.toString() };
    }
    return null;
};

export const getAffiliateLinkByAffiliatorProduct = async (affiliatorId: string, productId: string): Promise<AffiliateLink | null> => {
    const client = await clientPromise;
    const db = client.db();

    // Check various ID formats if needed, but assuming canonical string for now based on other code
    const link = await db.collection<AffiliateLink>('affiliateLinks').findOne({
        affiliatorId,
        productId // Canonical string ID usually
    });

    if (link) {
        return { ...link, id: link._id?.toString() };
    }
    return null;
};
