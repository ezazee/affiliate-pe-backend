import express from 'express';
import clientPromise from '../../config/database';

const router = express.Router();

// POST /admin/cleanup
/**
 * @swagger
 * /admin/cleanup:
 *   post:
 *     summary: Cleanup database (Dev/Test only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Cleanup results
 */
router.post('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const linksResult = await db.collection('affiliateLinks').deleteMany({});
        const commissionsResult = await db.collection('commissions').deleteMany({});
        const ordersResult = await db.collection('orders').deleteMany({});
        const withdrawalsResult = await db.collection('withdrawals').deleteMany({});

        const testUserEmails = ['alice@example.com', 'bob@example.com', 'newuser@test.com'];
        const usersResult = await db.collection('users').deleteMany({
            email: { $in: testUserEmails }
        });

        await db.collection('settings').deleteMany({});
        await db.collection('settings').insertMany([
            { name: 'minimumWithdrawal', value: 50000, createdAt: new Date() }
        ]);

        const results = {
            affiliateLinks: linksResult.deletedCount,
            commissions: commissionsResult.deletedCount,
            orders: ordersResult.deletedCount,
            withdrawals: withdrawalsResult.deletedCount,
            users: usersResult.deletedCount,
            settingsReset: true
        };

        return res.json({
            success: true,
            message: 'Cleanup complete',
            results
        });

    } catch (error: any) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ error: 'Failed to cleanup database', details: error.message });
    }
});

export default router;
