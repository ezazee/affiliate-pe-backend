import express from 'express';
import { AffiliateLink, Commission, Order, Withdrawal, User, Setting } from '../../models';
import { Op } from 'sequelize';

const router = express.Router();

// POST /admin/cleanup
/**
 * @swagger
 * /admin/cleanup:
 *   post:
 *     summary: Cleanup database (Dev/Test only)
 *     tags: [Admin]
 */
router.post('/', async (req, res) => {
    try {
        const linksDeleted = await AffiliateLink.destroy({ where: {}, truncate: false });
        const commissionsDeleted = await Commission.destroy({ where: {}, truncate: false });
        const ordersDeleted = await Order.destroy({ where: {}, truncate: false });
        const withdrawalsDeleted = await Withdrawal.destroy({ where: {}, truncate: false });

        const testUserEmails = ['alice@example.com', 'bob@example.com', 'newuser@test.com'];
        const usersDeleted = await User.destroy({
            where: {
                email: { [Op.in]: testUserEmails }
            }
        });

        await Setting.destroy({ where: {} });
        await Setting.create({ name: 'minimumWithdrawal', value: 50000 });

        const results = {
            affiliateLinks: linksDeleted,
            commissions: commissionsDeleted,
            orders: ordersDeleted,
            withdrawals: withdrawalsDeleted,
            users: usersDeleted,
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
