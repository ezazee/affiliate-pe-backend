import express from 'express';
import { Withdrawal, Commission, User } from '../../models';
import { authenticateUser, requireAuth } from '../../middleware/auth';
import { affiliatorNotifications } from '../../services/notification-service';
import { Op } from 'sequelize';
import db from '../../config/database';

const router = express.Router();

/**
 * @swagger
 * /admin/withdrawals:
 *   get:
 *     summary: List all withdrawal requests
 *     tags: [Admin]
 */
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.findAll({
            order: [['requestedAt', 'DESC']]
        });
        res.json(withdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/withdrawals/{id}:
 *   put:
 *     summary: Approve or reject withdrawal
 *     tags: [Admin]
 */
router.put('/:id', authenticateUser, requireAuth, async (req, res) => {
    const t = await db.transaction();
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!status) {
            await t.rollback();
            return res.status(400).json({ error: 'status is required' });
        }

        // Get withdrawal details
        const withdrawal = await Withdrawal.findOne({
            where: {
                [Op.or]: [{ id }, { _id: id }]
            },
            transaction: t
        });

        if (!withdrawal) {
            await t.rollback();
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        // Get affiliator info for notifications
        const affiliator = await User.findOne({
            where: {
                [Op.or]: [{ id: withdrawal.affiliatorId }, { _id: withdrawal.affiliatorId }]
            },
            transaction: t
        });

        await withdrawal.update({
            status,
            processedAt: new Date(),
            updatedAt: new Date(),
            ...(status === 'rejected' && rejectionReason && { rejectionReason })
        }, { transaction: t });

        // Handle commission status based on withdrawal status
        const reservedCommissions = await Commission.findAll({
            where: {
                withdrawalId: withdrawal.id,
                status: 'reserved'
            },
            transaction: t
        });

        if (status === 'approved' || status === 'completed') {
            await Commission.update(
                { status: 'withdrawn' },
                { 
                    where: { 
                        withdrawalId: withdrawal.id,
                        status: 'reserved' 
                    },
                    transaction: t 
                }
            );
        } else if (status === 'rejected') {
            for (const reserved of reservedCommissions) {
                if (reserved.isPartial && reserved.parentCommissionId) {
                    // Update parent commission usedAmount
                    const parent = await Commission.findByPk(reserved.parentCommissionId, { transaction: t });
                    if (parent) {
                        await parent.update({
                            usedAmount: Number(parent.usedAmount) - Number(reserved.amount)
                        }, { transaction: t });
                    }
                    // Delete reserved commission record
                    await reserved.destroy({ transaction: t });
                }
            }
        }

        await t.commit();

        // Send notifications
        try {
            if (affiliator && affiliator.email) {
                if (status === 'approved' || status === 'completed') {
                    await affiliatorNotifications.withdrawalApproved(
                        (Number(withdrawal.amount) || 0).toLocaleString('id-ID'),
                        new Date().toLocaleString('id-ID'),
                        affiliator.email
                    );

                    // Update balance notification
                    const availableCommissions = await Commission.findAll({
                        where: {
                            affiliatorId: withdrawal.affiliatorId,
                            status: 'paid'
                        }
                    });

                    const availableBalance = availableCommissions.reduce((sum, commission) => {
                        const usedAmount = Number(commission.usedAmount) || 0;
                        return sum + (Number(commission.amount) - usedAmount);
                    }, 0);

                    await affiliatorNotifications.balanceUpdated(
                        availableBalance.toLocaleString('id-ID'),
                        affiliator.email
                    );

                } else if (status === 'rejected') {
                    await affiliatorNotifications.withdrawalRejected(
                        (Number(withdrawal.amount) || 0).toLocaleString('id-ID'),
                        rejectionReason || 'Admin rejection',
                        affiliator.email
                    );
                }
            }
        } catch (notificationError) {
            console.error('❌ Failed to send notifications for withdrawal update:', notificationError);
        }

        res.json(withdrawal);
    } catch (error) {
        if (t) await t.rollback();
        console.error('Error updating withdrawal:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
