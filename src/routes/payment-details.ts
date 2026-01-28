import express from 'express';
import clientPromise from '../config/database';
import { ObjectId } from 'mongodb';

const router = express.Router();

/**
 * @swagger
 * /payment-details/{paymentToken}:
 *   get:
 *     summary: Ambil detail pesanan via token pembayaran
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: paymentToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       410:
 *         description: Payment link expired
 *       409:
 *         description: Payment link already used
 */
// GET /api/payment-details/:paymentToken
router.get('/:paymentToken', async (req, res) => {
    const { paymentToken } = req.params;

    if (!paymentToken) {
        return res.status(400).json({ error: 'Payment token is required' });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const orders = await db.collection('orders').aggregate([
            { $match: { paymentToken } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
        ]).toArray();

        const order = orders[0];

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if the payment link has expired
        if (order.paymentTokenExpiresAt && new Date() > new Date(order.paymentTokenExpiresAt)) {
            // Optionally, update the order status to 'cancelled' if expired
            await db.collection('orders').updateOne(
                { _id: order._id },
                { $set: { status: 'cancelled' } }
            );
            return res.status(410).json({ error: 'Payment link has expired' }); // 410 Gone
        }

        // Check if the payment link has already been used
        if (order.isPaymentUsed) {
            return res.status(409).json({ error: 'Payment link already used' }); // 409 Conflict
        }

        const orderWithId = { ...order, id: order._id?.toString() };
        return res.json(orderWithId);

    } catch (error) {
        console.error('Error fetching payment details:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
