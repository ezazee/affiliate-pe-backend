import express from 'express';
import clientPromise from '../../config/database';
import { ObjectId } from 'mongodb';
import { authenticateUser, requireAuth } from '../../middleware/auth';
import { affiliatorNotifications } from '../../services/notification-service';

const router = express.Router();

/**
 * @swagger
 * /admin/withdrawals:
 *   get:
 *     summary: List all withdrawal requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of withdrawals
 *   put:
 *     summary: Approve or reject withdrawal
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, completed]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal updated
 */
// GET /api/admin/withdrawals
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const withdrawals = await db.collection('withdrawals')
            .find({})
            .sort({ requestedAt: -1 })
            .toArray();

        const formattedWithdrawals = withdrawals.map(withdrawal => ({
            ...withdrawal,
            id: withdrawal._id.toString(),
        }));

        res.json(formattedWithdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// PUT /api/admin/withdrawals/:id
router.put('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }

        const client = await clientPromise;
        const db = client.db();

        // Get withdrawal details
        const withdrawal = await db.collection('withdrawals').findOne({ _id: new ObjectId(id) });

        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }

        // Get affiliator info for notifications
        const affiliator = await db.collection('users').findOne({ _id: new ObjectId(withdrawal.affiliatorId) });

        const result = await db.collection('withdrawals').findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status,
                    processedAt: new Date(),
                    updatedAt: new Date(),
                    ...(status === 'rejected' && rejectionReason && { rejectionReason })
                }
            },
            { returnDocument: 'after' }
        );

        // Handle commission status based on withdrawal status
        const commissionsCollection = db.collection('commissions');

        // Find all reserved commissions for this withdrawal
        // Note: New backend types might differ, ensuring compatibility with DB schema
        const reservedCommissions = await commissionsCollection.find({
            withdrawalId: id,
            status: 'reserved'
        }).toArray();

        if (status === 'approved' || status === 'completed') {
            // Mark reserved commissions as withdrawn (final)
            for (const reserved of reservedCommissions) {
                await commissionsCollection.updateOne(
                    { _id: reserved._id },
                    { $set: { status: 'withdrawn' } }
                );
            }

        } else if (status === 'rejected') {
            // Kembalikan saldo
            for (const reserved of reservedCommissions) {
                // If it was partial and has parent, we might need to revert logic.
                // Replicating Next.js logic:
                if (reserved.isPartial && reserved.parentCommissionId) {
                    // Delete reserved commission
                    await commissionsCollection.deleteOne({ _id: reserved._id });

                    // Kembalikan usedAmount di parent commission
                    await commissionsCollection.updateOne(
                        { _id: new ObjectId(reserved.parentCommissionId) },
                        { $inc: { usedAmount: -reserved.amount } }
                    );
                } else {
                    // If it's not partial/no parent logic, we might just un-reserve it?
                    // Next.js code only handled the isPartial && parentCommissionId case explicitly in the loop for 'returning saldo'.
                    // Wait, if it's a full commission withdrawal that got rejected, it should probably go back to 'approved' or 'paid' status?
                    // The Next.js code shown in Step 82 ONLY handles the `if (reserved.isPartial && reserved.parentCommissionId)` block inside the loop.
                    // This implies full commissions might stay 'reserved' or requires manual intervention?
                    // Or maybe they don't use 'reserved' status for full withdrawals?
                    // I will stick EXACTLY to the Next.js logic provided.
                }
            }
        }

        // Send notifications
        try {
            if (affiliator && affiliator.email) {
                if (status === 'approved' || status === 'completed') {
                    await affiliatorNotifications.withdrawalApproved(
                        (withdrawal.amount || 0).toLocaleString('id-ID'),
                        new Date().toLocaleString('id-ID'),
                        affiliator.email
                    );

                    // Update balance notification
                    const allCommissions = await db.collection('commissions').find({
                        affiliatorId: withdrawal.affiliatorId,
                        status: 'paid'
                    }).toArray();

                    const availableBalance = allCommissions.reduce((sum, commission) => {
                        const usedAmount = commission.usedAmount || 0;
                        return sum + (commission.amount - usedAmount);
                    }, 0);

                    await affiliatorNotifications.balanceUpdated(
                        availableBalance.toLocaleString('id-ID'),
                        affiliator.email
                    );

                } else if (status === 'rejected') {
                    await affiliatorNotifications.withdrawalRejected(
                        (withdrawal.amount || 0).toLocaleString('id-ID'),
                        rejectionReason || 'Admin rejection',
                        affiliator.email
                    );
                }
            }
        } catch (notificationError) {
            console.error('❌ Failed to send notifications for withdrawal update:', notificationError);
        }

        res.json(result);
    } catch (error) {
        console.error('Error updating withdrawal:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
