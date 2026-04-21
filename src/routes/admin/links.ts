import express from 'express';
import { AffiliateLink, User } from '../../models';

const router = express.Router();

/**
 * @swagger
 * /admin/links:
 *   get:
 *     summary: Get all affiliate links
 *     tags: [Admin]
 */
router.get('/', async (req, res) => {
    try {
        const affiliateLinks = await AffiliateLink.findAll({
            include: [{
                model: User,
                as: 'user',
                attributes: { exclude: ['password'] }
            }]
        });

        return res.json(affiliateLinks);
    } catch (error) {
        console.error('Error fetching affiliate links:', error);
        return res.status(500).json({ error: 'Failed to fetch links' });
    }
});

export default router;
