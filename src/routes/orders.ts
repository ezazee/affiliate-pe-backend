import express from 'express';
import clientPromise from '../config/database';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import { Order, OrderStatus } from '../types/order';
import { adminNotifications, affiliatorNotifications } from '../services/notification-service';

const router = express.Router();

// Helper to generate unique order number
const generateOrderNumber = async (db: any): Promise<string> => {
    const prefix = 'ORDER';
    let isUnique = false;
    let orderNumber = '';
    while (!isUnique) {
        const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
        orderNumber = `${prefix}-${randomPart}`;
        const existingOrder = await db.collection('orders').findOne({ orderNumber });
        if (!existingOrder) {
            isUnique = true;
        }
    }
    return orderNumber;
};

/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Endpoint Publik
 */

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Buat pesanan baru (Publik)
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - buyerName
 *               - buyerPhone
 *               - shippingAddress
 *               - city
 *               - province
 *               - postalCode
 *               - productId
 *               - affiliatorId
 *             properties:
 *               buyerName:
 *                 type: string
 *               buyerPhone:
 *                 type: string
 *               shippingAddress:
 *                 type: string
 *               city:
 *                 type: string
 *               province:
 *                 type: string
 *               postalCode:
 *                 type: string
 *               orderNote:
 *                 type: string
 *               productId:
 *                 type: string
 *               affiliatorId:
 *                 type: string
 *               affiliateCode:
 *                 type: string
 *               affiliateName:
 *                 type: string
 *               shippingCost:
 *                 type: number
 *               totalPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Order created
 *       400:
 *         description: Missing fields
 */
router.post('/', async (req, res) => {
    try {
        const {
            buyerName,
            buyerPhone,
            shippingAddress,
            city,
            province,
            postalCode,
            orderNote,
            productId,
            affiliatorId,
            affiliateCode,
            affiliateName,
            shippingCost,
            totalPrice,
        } = req.body;

        if (
            !buyerName || !buyerPhone || !shippingAddress || !city || !province || !postalCode ||
            !productId || !affiliatorId || !affiliateCode || !affiliateName ||
            shippingCost === undefined || totalPrice === undefined
        ) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const client = await clientPromise;
        const db = client.db();

        const orderNumber = await generateOrderNumber(db);
        const paymentToken = uuidv4();
        const paymentTokenExpiresAt = new Date(Date.now() + 1 * 60 * 1000);

        const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
        const productPrice = product?.price || 0;

        const orderToInsert = {
            orderNumber,
            paymentToken,
            paymentTokenExpiresAt,
            isPaymentUsed: false,
            buyerName,
            buyerPhone,
            shippingAddress,
            city,
            province,
            postalCode,
            productId,
            affiliatorId,
            affiliateCode,
            affiliateName,
            status: 'pending' as OrderStatus,
            shippingCost,
            productPrice,
            totalPrice,
            orderNote,
            createdAt: new Date(),
        };

        await db.collection('orders').insertOne(orderToInsert);

        // Notifications
        const affiliator = await db.collection('users').findOne({ _id: new ObjectId(affiliatorId) });

        try {
            await adminNotifications.newOrder(
                orderNumber,
                buyerName,
                totalPrice.toLocaleString('id-ID')
            );

            if (affiliator && affiliator.email) {
                const commissionRate = 0.1;
                const commissionAmount = Math.round(productPrice * commissionRate);
                await affiliatorNotifications.newOrder(
                    orderNumber,
                    commissionAmount.toLocaleString('id-ID'),
                    affiliator.email
                );
            }
        } catch (e) {
            console.error('Notification error', e);
        }

        return res.status(201).json({
            paymentToken: orderToInsert.paymentToken,
            orderNumber: orderToInsert.orderNumber,
            status: orderToInsert.status
        });
    } catch (error) {
        console.error('Order creation error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /orders/:orderNumber
router.get('/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const client = await clientPromise;
        const db = client.db();

        const order = await db.collection('orders').findOne({ orderNumber });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        return res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        return res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// PATCH /orders/:orderNumber
router.patch('/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection('orders').updateOne(
            { orderNumber },
            {
                $set: {
                    status,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Fetch the updated order to get details for notifications/commissions
        const order = await db.collection('orders').findOne({ orderNumber });
        if (!order) {
            return res.status(404).json({ error: 'Order not found after update' });
        }

        // Handle Side Effects (Timestamps, Notifications, Commissions)
        const updateData: any = {};
        if (status === 'shipped') {
            updateData.shippedAt = new Date();
        } else if (status === 'completed') {
            updateData.completedAt = new Date();
        }

        // Apply timestamp updates if any
        if (Object.keys(updateData).length > 0) {
            await db.collection('orders').updateOne({ orderNumber }, { $set: updateData });
        }

        // Send Notifications & Handle Commissions
        try {
            const affiliator = await db.collection('users').findOne({ _id: new ObjectId(order.affiliatorId) });
            const targetEmail = affiliator?.email;

            if (targetEmail) {
                if (status === 'shipped' || status === 'shipping') {
                    await affiliatorNotifications.orderShipped(
                        orderNumber,
                        order.buyerName,
                        targetEmail
                    );
                } else if (status === 'paid' || status === 'completed') {
                    // Send Paid Notification
                    await affiliatorNotifications.orderPaid(
                        orderNumber,
                        targetEmail
                    );

                    // Also send Completed notification if it was explicitly 'completed' (legacy behavior compatibility)
                    if (status === 'completed') {
                        await affiliatorNotifications.orderCompleted(
                            orderNumber,
                            order.buyerName,
                            targetEmail
                        );
                    }

                    // COMMISSION LOGIC (Triggered on PAID or COMPLETED)
                    // 1. Check if commission already exists to avoid duplicates
                    const existingCommission = await db.collection('commissions').findOne({
                        orderNumber: orderNumber
                    });

                    if (!existingCommission) {
                        const commissionRate = 0.1; // 10% commission
                        const commissionAmount = Math.round(order.productPrice * commissionRate);

                        // Fetch product for name
                        const product = await db.collection('products').findOne({ _id: new ObjectId(order.productId) });

                        // Insert commission
                        await db.collection('commissions').insertOne({
                            orderNumber,
                            orderId: orderNumber,
                            affiliatorId: order.affiliatorId,
                            productId: order.productId,
                            productName: product?.name || 'Product',
                            amount: commissionAmount,
                            status: 'paid', // Mark as paid so it is withdrawable
                            createdAt: new Date(),
                            date: new Date(),
                            completedAt: new Date()
                        });

                        // Calculate and send balance update notification
                        const allCommissions = await db.collection('commissions').find({
                            affiliatorId: order.affiliatorId,
                            status: 'paid'
                        }).toArray();

                        const availableBalance = allCommissions.reduce((sum, commission) => {
                            const usedAmount = commission.usedAmount || 0;
                            return sum + (commission.amount - usedAmount);
                        }, 0);

                        await affiliatorNotifications.commissionEarned(
                            commissionAmount.toLocaleString('id-ID'),
                            orderNumber,
                            targetEmail
                        );

                        await affiliatorNotifications.balanceUpdated(
                            availableBalance.toLocaleString('id-ID'),
                            targetEmail
                        );
                    }
                }
            }
        } catch (notificationError) {
            console.error('❌ Failed to send notifications/commissions for order update:', notificationError);
            // Don't fail the request if notifications fail, but log it.
        }

        return res.json({ message: `Order ${orderNumber} status updated to ${status}` });
    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ error: 'Failed to update order status' });
    }
});

export default router;
