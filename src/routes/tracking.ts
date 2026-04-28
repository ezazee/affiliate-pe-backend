import express from 'express';
import { LinkClick } from '../models';
import { getProductBySlug, getUserByReferralCode, getAffiliateLinkByAffiliatorProduct } from '../services/dataService';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { ref, productSlug } = req.body;

        if (!ref || !productSlug) {
            return res.json({ success: true, warning: 'ref and productSlug required' });
        }

        const affiliator = await getUserByReferralCode(ref);
        if (!affiliator) {
            console.warn(`[Tracking] Affiliator not found for ref: ${ref}`);
            return res.json({ success: true, warning: 'affiliator not found' });
        }

        const product = await getProductBySlug(productSlug);
        if (!product) {
            console.warn(`[Tracking] Product not found for slug/id: ${productSlug}`);
            return res.json({ success: true, warning: 'product not found' });
        }

        const affiliateLink = await getAffiliateLinkByAffiliatorProduct(affiliator.id, product.id);

        if (affiliateLink) {
            // 1. Log click for analytics
            await LinkClick.create({
                linkId: affiliateLink.id,
                createdAt: new Date(),
            } as any);

            // 2. Increment summary counter for fast access
            await affiliateLink.increment('clicks');

            return res.json({ success: true, tracked: true });
        } else {
            console.warn(`[Tracking] No affiliate link found for affiliator ${affiliator.id} and product ${product.id}`);
            return res.json({ success: true, tracked: false, warning: 'no affiliate link found' });
        }
    } catch (error) {
        console.error('Error tracking click:', error);
        return res.json({ success: true, error: 'internal error' });
    }
});

export default router;
