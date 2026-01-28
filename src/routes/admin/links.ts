import express from 'express';
import clientPromise from '../../config/database';

const router = express.Router();

/**
 * @swagger
 * /admin/links:
 *   get:
 *     summary: Get all affiliate links
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of affiliate links with user info
 */
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const affiliateLinks = await db.collection('affiliateLinks')
            .aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'affiliatorId',
                        foreignField: '_id',
                        as: 'user'
                    }
                },
                {
                    $unwind: '$user'
                },
                {
                    $project: {
                        'user.password': 0
                    }
                }
            ])
            .toArray();

        // Map _id in result if needed or let frontend handle it. 
        // Aggregation results are raw documents.
        const formattedLinks = affiliateLinks.map(link => ({
            ...link,
            id: link._id.toString(),
            user: { ...link.user, id: link.user._id.toString() }
        }));

        return res.json(formattedLinks);
    } catch (error) {
        console.error('Error fetching affiliate links:', error);
        return res.status(500).json({ error: 'Failed to fetch links' });
    }
});

export default router;
