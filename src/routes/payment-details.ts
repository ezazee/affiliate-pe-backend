import express from 'express';
import { Order } from '../models';

const router = express.Router();

/**
 * @swagger
 * /payment-details/{paymentToken}:
 *   get:
 *     summary: Ambil detail pesanan via token pembayaran
 *     tags: [Public]
 */
router.get('/:paymentToken', async (req, res) => {
    const { paymentToken } = req.params;

    if (!paymentToken) {
        return res.status(400).json({ error: 'Payment token is required' });
    }

    try {
        const order = await Order.findOne({
            where: { paymentToken },
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if the payment link has expired
        if (order.paymentTokenExpiresAt && new Date() > new Date(order.paymentTokenExpiresAt)) {
            // Update the order status to 'cancelled' if expired and not already handled
            if (order.status === 'pending') {
                await order.update({ status: 'cancelled' });
            }
            return res.status(410).json({ error: 'Payment link has expired' }); // 410 Gone
        }

        // Check if the payment link has already been used
        if (order.isPaymentUsed) {
            return res.status(409).json({ error: 'Payment link already used' }); // 409 Conflict
        }

        return res.json(order);

    } catch (error) {
        console.error('Error fetching payment details:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
