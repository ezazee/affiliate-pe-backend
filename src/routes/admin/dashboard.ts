import express from 'express';
import { User, AffiliateLink, Order, Commission, Product } from '../../models';

const router = express.Router();

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics (Admin)
 *     tags: [Admin]
 */
router.get('/', async (req, res) => {
    try {
        // Fetch all affiliators with their related data
        const affiliators = await User.findAll({
            where: { role: 'affiliator' },
            attributes: { exclude: ['password'] },
            include: [
                {
                    model: AffiliateLink,
                    as: 'affiliateLinks'
                },
                {
                    model: Order,
                    as: 'orders',
                    include: [
                        {
                            model: Product,
                            as: 'product'
                        }
                    ]
                },
                {
                    model: Commission,
                    as: 'commissions'
                }
            ]
        });

        // Calculate stats per affiliator
        const affiliatorStats = affiliators.map(user => {
            const affiliator = user.toJSON() as any;
            const links = affiliator.affiliateLinks || [];
            const orders = (affiliator.orders || []) as any[];
            const commissions = (affiliator.commissions || []) as any[];

            const totalOrders = orders.length;
            const paidOrders = orders.filter(o => ['paid', 'completed', 'shipping', 'delivered'].includes(o.status)).length;
            const totalRevenue = orders
                .filter(o => ['paid', 'completed', 'shipping', 'delivered'].includes(o.status))
                .reduce((sum, o) => sum + (Number(o.totalPrice) || 0), 0);

            // Calculate commissions
            const totalCommission = commissions
                .filter(c => !c.isPartial && ['approved', 'paid', 'withdrawn', 'processed'].includes(c.status))
                .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

            const paidCommission = commissions
                .filter(c => !c.isPartial && (c.status === 'paid' || c.status === 'withdrawn'))
                .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

            const withdrawableCommission = commissions
                .filter(c => !c.isPartial && c.status === 'paid')
                .reduce((sum, c) => {
                    const usedAmount = Number(c.usedAmount) || 0;
                    return sum + (Number(c.amount) - usedAmount);
                }, 0);

            return {
                ...affiliator,
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

        // Calculate Top Products
        const productCounts: Record<string, number> = {};
        affiliators.forEach(user => {
            const orders = ((user.toJSON() as any).orders || []) as any[];
            orders.forEach(o => {
                if (['paid', 'completed', 'shipping', 'delivered'].includes(o.status)) {
                    const productName = o.product?.name || o.productName || 'Unknown Product';
                    productCounts[productName] = (productCounts[productName] || 0) + 1;
                }
            });
        });

        const topProducts = Object.entries(productCounts)
            .map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);

        // Overall stats
        const overallStats = {
            totalAffiliators: affiliatorStats.length,
            totalOrders: affiliatorStats.reduce((sum: number, a: any) => sum + a.stats.totalOrders, 0),
            paidOrders: affiliatorStats.reduce((sum: number, a: any) => sum + a.stats.paidOrders, 0),
            totalRevenue: affiliatorStats.reduce((sum: number, a: any) => sum + a.stats.totalRevenue, 0),
            totalCommission: affiliatorStats.reduce((sum: number, a: any) => sum + a.stats.totalCommission, 0),
            netRevenue: affiliatorStats.reduce((sum: number, a: any) => sum + (a.stats.totalRevenue - a.stats.totalCommission), 0),
            activeAffiliators: affiliatorStats.filter((a: any) => a.stats.totalOrders > 0).length
        };

        res.json({
            overallStats,
            topProducts,
            affiliators: affiliatorStats
        });

    } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
