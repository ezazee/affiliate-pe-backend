import express from 'express';
import clientPromise from '../../config/database';

const router = express.Router();

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
// GET /api/admin/dashboard
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        // Get all affiliators
        const affiliators = await db.collection('users').aggregate([
            { $match: { role: 'affiliator' } },
            {
                $addFields: {
                    affiliatorIdString: { $toString: '$_id' }
                }
            },
            {
                $lookup: {
                    from: 'affiliateLinks',
                    localField: 'affiliatorIdString',
                    foreignField: 'affiliatorId',
                    as: 'links'
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'affiliatorIdString',
                    foreignField: 'affiliatorId',
                    as: 'orders'
                }
            },
            {
                $lookup: {
                    from: 'commissions',
                    localField: 'affiliatorIdString',
                    foreignField: 'affiliatorId',
                    as: 'commissions'
                }
            },
            {
                $project: {
                    password: 0, // Exclude password
                    affiliatorIdString: 0 // Exclude temporary field
                }
            }
        ]).toArray();

        // Calculate stats per affiliator
        const affiliatorStats = affiliators.map(affiliator => {
            const links = affiliator.links || [];
            const orders = (affiliator.orders || []) as any[]; // simple casting
            const commissions = (affiliator.commissions || []) as any[];

            const totalOrders = orders.length;
            const paidOrders = orders.filter(o => o.status === 'paid').length;
            const totalRevenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + (o.totalPrice || 0), 0);

            // Calculate commissions
            const totalCommission = commissions
                .filter(c => c.status === 'approved' || c.status === 'paid')
                .reduce((sum, c) => sum + (c.amount || 0), 0);

            const paidCommission = commissions
                .filter(c => c.status === 'paid')
                .reduce((sum, c) => sum + (c.amount || 0), 0);

            const withdrawableCommission = commissions
                .filter(c => c.status === 'approved')
                .reduce((sum, c) => sum + (c.amount || 0), 0);

            return {
                ...affiliator,
                id: affiliator._id?.toString(),
                stats: {
                    totalLinks: links.length,
                    totalOrders,
                    paidOrders,
                    totalRevenue,
                    totalCommission,
                    paidCommission,
                    withdrawableCommission,
                    conversionRate: totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(1) : '0'
                }
            };
        });

        // Overall stats
        const overallStats = {
            totalAffiliators: affiliatorStats.length,
            totalOrders: affiliatorStats.reduce((sum, a) => sum + a.stats.totalOrders, 0),
            paidOrders: affiliatorStats.reduce((sum, a) => sum + a.stats.paidOrders, 0),
            totalRevenue: affiliatorStats.reduce((sum, a) => sum + a.stats.totalRevenue, 0),
            totalCommission: affiliatorStats.reduce((sum, a) => sum + a.stats.totalCommission, 0),
            netRevenue: affiliatorStats.reduce((sum, a) => sum + (a.stats.totalRevenue - a.stats.totalCommission), 0), // Pendapatan bersih
            activeAffiliators: affiliatorStats.filter(a => a.stats.totalOrders > 0).length
        };

        res.json({
            overallStats,
            affiliators: affiliatorStats
        });

    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
