import express from 'express';
import { getProductBySlug, getUserByReferralCode, getAffiliateLinkByAffiliatorProduct } from '../services/dataService';

const router = express.Router();

/**
 * @swagger
 * /checkout/{productSlug}:
 *   get:
 *     summary: Validasi detail checkout
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: productSlug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: ref
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checkout details (product, affiliator, link)
 *       400:
 *         description: Missing referral code
 *       404:
 *         description: Not found
 */
// GET /api/checkout/:productSlug
router.get('/:productSlug', async (req, res) => {
    try {
        const { productSlug } = req.params;
        const { ref } = req.query;
        const refCode = ref as string;

        if (!refCode) {
            return res.status(400).json({ error: 'Referral code is missing' });
        }

        // 1. Find the affiliator by their referral code
        const affiliator = await getUserByReferralCode(refCode);

        if (!affiliator || affiliator.status !== 'approved') {
            return res.status(404).json({ error: 'Affiliator not found or not approved' });
        }

        // 2. Find the product by its slug
        const product = await getProductBySlug(productSlug);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // 3. Find the specific affiliate link for this affiliator and product
        // Note: checking strict types for IDs might be needed if services return strings vs ObjectIds
        const affiliateLink = await getAffiliateLinkByAffiliatorProduct(affiliator.id, product.id);

        if (!affiliateLink || !affiliateLink.isActive) {
            return res.status(404).json({ error: 'Affiliate link not found or inactive' });
        }

        // All checks passed, return the data
        return res.json({ product, affiliateLink, affiliator });
    } catch (error) {
        console.error('Checkout API error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
