import { Product, User, AffiliateLink } from '../models';
import { Op } from 'sequelize';

export const getProductBySlug = async (slugOrId: string): Promise<Product | null> => {
    // Try by slug first
    let product = await Product.findOne({ where: { slug: slugOrId } });
    
    // Fallback to ID/UUID if not found by slug
    if (!product && slugOrId) {
        // Check if it's a valid UUID or Integer
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);
        const isInt = /^\d+$/.test(slugOrId);
        
        if (isUUID || isInt) {
            product = await Product.findOne({
                where: {
                    [Op.or]: [{ id: slugOrId }, { _id: slugOrId }]
                }
            });
        }
    }
    
    return product;
};

export const getUserByReferralCode = async (referralCode: string): Promise<User | null> => {
    return await User.findOne({ where: { referralCode } });
};

export const getAffiliateLinkByAffiliatorProduct = async (affiliatorId: string, productId: string): Promise<AffiliateLink | null> => {
    return await AffiliateLink.findOne({
        where: {
            [Op.and]: [
                { [Op.or]: [{ affiliatorId: affiliatorId }, { _id: affiliatorId }] },
                { [Op.or]: [{ productId: productId }, { _id: productId }] }
            ]
        }
    });
};
