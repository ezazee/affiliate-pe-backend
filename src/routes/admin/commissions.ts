import express from 'express';
import { Commission } from '../../models';
import { authenticateUser, requireAuth } from '../../middleware/auth';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @swagger
 * /admin/commissions:
 *   get:
 *     summary: List all commissions
 *     tags: [Admin]
 */
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const commissions = await Commission.findAll({
            where: {
                isPartial: {
                    [Op.ne]: true
                }
            },
            order: [['createdAt', 'DESC']]
        });

        res.json(commissions);
    } catch (error) {
        console.error('Error fetching admin commissions:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/commissions:
 *   put:
 *     summary: Update commission status
 *     tags: [Admin]
 */
router.put('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { commissionId, status } = req.body;

        if (!commissionId || !status) {
            return res.status(400).json({ error: 'commissionId and status are required' });
        }

        const commission = await Commission.findOne({
            where: {
                [Op.or]: [{ id: commissionId }, { _id: commissionId }]
            }
        });

        if (!commission) {
            return res.status(404).json({ error: 'Commission not found' });
        }

        await commission.update({ status, updatedAt: new Date() });

        res.json(commission);
    } catch (error) {
        console.error('Error updating commission:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
