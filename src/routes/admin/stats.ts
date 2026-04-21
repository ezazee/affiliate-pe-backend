import express from 'express';
import { Order, Commission, Product, User } from '../../models';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get admin dashboard stats (summary)
 *     tags: [Admin]
 */
router.get('/', async (req, res) => {
    try {
        const [paidOrders, allCommissions, approvedAffiliatorsCount, totalOrdersCount] = await Promise.all([
            Order.findAll({ 
                where: { 
                    status: { [Op.in]: ['paid', 'completed'] } 
                } 
            }),
            Commission.findAll(),
            User.count({ 
                where: { 
                    role: 'affiliator', 
                    status: 'approved' 
                } 
            }),
            Order.count()
        ]);

        const totalGrossRevenue = paidOrders.reduce((sum, order) => {
            return sum + (Number(order.productPrice) || 0);
        }, 0);

        const totalCommissionsValue = allCommissions.reduce((sum, c) => {
            return sum + (Number(c.amount) || 0);
        }, 0);

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
