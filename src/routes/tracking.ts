import express from 'express';
import clientPromise from '../config/database';
import { getProductBySlug, getUserByReferralCode, getAffiliateLinkByAffiliatorProduct } from '../services/dataService';

const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const { ref, productSlug } = req.body;

        if (!ref || !productSlug) {
            // Return 200 even on error to not break frontend tracking (as per original logic returning success true)
            // But better to log it.
            return res.json({ success: true, warning: 'ref and productSlug required' });
        }

        const affiliator = await getUserByReferralCode(ref);
        if (!affiliator) {
            return res.json({ success: true });
        }

        const product = await getProductBySlug(productSlug);
        if (!product) {
            return res.json({ success: true });
        }

        // Note: Affiliator ID handling - check if string or ObjectId needed.
        // dataService usually returns ID as string in .id field.
        const affiliateLink = await getAffiliateLinkByAffiliatorProduct(affiliator.id, product.id);

        if (affiliateLink) {
            const client = await clientPromise;
            const db = client.db();
            await db.collection('link_clicks').insertOne({
                linkId: affiliateLink._id, // Using the _id from the link document
                createdAt: new Date(),
            });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Error tracking click:', error);
        return res.json({ success: true });
    }
});

export default router;
