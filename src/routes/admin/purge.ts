import express from 'express';
import clientPromise from '../../config/database';

const router = express.Router();

// POST /admin/purge
/**
 * @swagger
 * /admin/purge:
 *   post:
 *     summary: Purge entire database (Dev/Test only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Purge results
 */
router.post('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const collectionsToPurge = ['users', 'products', 'orders', 'commissions', 'affiliateLinks', 'withdrawals', 'settings'];

        const results = [];
        for (const collectionName of collectionsToPurge) {
            try {
                const result = await db.collection(collectionName).deleteMany({});
                results.push({
                    collection: collectionName,
                    deletedCount: result.deletedCount
                });
            } catch (e: any) {
                // Ignore NamespaceNotFound
                if (e.codeName !== 'NamespaceNotFound') {
                    throw e;
                }
            }
        }

        try {
            await db.dropCollection('affiliatelinks'); // Handle lower case potential issue
            results.push({ collection: 'affiliatelinks', status: 'dropped' });
        } catch (e) { /* ignore */ }

        return res.json({
            success: true,
            message: 'Database purge complete',
            results
        });

    } catch (error: any) {
        console.error('Purge error:', error);
        return res.status(500).json({ error: 'Failed to purge database', details: error.message });
    }
});

export default router;
