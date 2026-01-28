import express from 'express';
import clientPromise from '../../config/database';

const router = express.Router();

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get admin dashboard stats (summary)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Stats object
 */
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const [paidOrders, allCommissions, products, approvedAffiliatorsCount, totalOrdersCount] = await Promise.all([
            db.collection('orders').find({ status: 'paid' }).toArray(),
            db.collection('commissions').find({}).toArray(),
            db.collection('products').find({}).toArray(),
            db.collection('users').countDocuments({ role: 'affiliator', status: 'approved' }),
            db.collection('orders').countDocuments()
        ]);

        const productPriceMap = new Map(products.map(p => [p._id.toString(), p.price]));

        const totalGrossRevenue = paidOrders.reduce((sum, order) => {
            const price = productPriceMap.get(order.productId) || 0;
            return sum + (Number(price) || 0); // Ensure number
        }, 0);

        const totalCommissionsValue = allCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);

        const totalNetRevenue = totalGrossRevenue - totalCommissionsValue;

        return res.json({
            totalRevenue: totalNetRevenue,
            totalAffiliators: approvedAffiliatorsCount,
            totalOrders: totalOrdersCount,
            totalCommissions: totalCommissionsValue,
        });

    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
