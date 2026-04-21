import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Order, Product, User, Commission } from '../models';
import { adminNotifications, affiliatorNotifications } from '../services/notification-service';
import { biteshipService } from '../services/biteship';
import { createDokuPayment, checkDokuStatus } from '../services/doku';
import { Op } from 'sequelize';

const router = express.Router();

// Helper to generate unique order number
const generateOrderNumber = async (): Promise<string> => {
    const prefix = 'ORDER';
    let isUnique = false;
    let orderNumber = '';
    while (!isUnique) {
        const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
        orderNumber = `${prefix}-${randomPart}`;
        const existingOrder = await Order.findOne({ where: { orderNumber } });
        if (!existingOrder) {
            isUnique = true;
        }
    }
    return orderNumber;
};

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Buat pesanan baru (Publik)
 *     tags: [Public]
 */
router.post('/', async (req, res) => {
    try {
        const {
            buyerName,
            buyerPhone,
            buyerEmail,
            shippingAddress,
            district,
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
            destinationAreaId,
            courierName,
            courierService,
        } = req.body;

        if (
            !buyerName || !buyerPhone || !buyerEmail || !shippingAddress || !district || !city || !province || !postalCode ||
            !productId || !affiliatorId || !affiliateCode || !affiliateName ||
            shippingCost === undefined || totalPrice === undefined
        ) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const orderNumber = await generateOrderNumber();
        const paymentToken = uuidv4();
        const paymentTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam

        const product = await Product.findOne({ 
            where: {
                [Op.or]: [{ id: productId }, { _id: productId }]
            }
        });
        const productPrice = product?.price || 0;

        const order = await Order.create({
            orderNumber,
            paymentToken,
            paymentTokenExpiresAt,
            isPaymentUsed: false,
            buyerName,
            buyerPhone,
            buyerEmail,
            shippingAddress,
            district,
            city,
            province,
            postalCode,
            productId: product?.id || productId,
            affiliatorId,
            affiliateCode,
            affiliateName,
            status: 'pending',
            shippingCost,
            productPrice: Number(productPrice),
            totalPrice: Number(totalPrice),
            orderNote,
            // Data kurir dari pilihan pembeli
            destinationAreaId: destinationAreaId || null,
            courierName: courierName || null,
            courierService: courierService || null,
            createdAt: new Date(),
        });

        // Notifications
        const affiliator = await User.findOne({ 
            where: {
                [Op.or]: [{ id: affiliatorId }, { _id: affiliatorId }]
            }
        });

        try {
            await adminNotifications.newOrder(
                orderNumber,
                buyerName,
                totalPrice.toLocaleString('id-ID')
            );

            if (affiliator && affiliator.email) {
                const commissionRate = 0.1;
                const commissionAmount = Math.round(Number(productPrice) * commissionRate);
                await affiliatorNotifications.newOrder(
                    orderNumber,
                    commissionAmount.toLocaleString('id-ID'),
                    affiliator.email
                );
            }
        } catch (e) {
            console.error('Notification error', e);
        }

        // ==============================================
        // BUAT SESI PEMBAYARAN DOKU
        // ==============================================
        try {
            const dokuPayment = await createDokuPayment({
                orderNumber,
                totalPrice: Number(totalPrice),
                buyerName,
                buyerEmail,
                buyerPhone,
                productName: product?.name || 'Produk PE Skinpro',
                productPrice: Number(productPrice),
            });

            return res.status(201).json({
                paymentToken: order.paymentToken,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentUrl: dokuPayment.paymentUrl,
            });
        } catch (dokuError: any) {
            console.error('❌ DOKU payment creation failed:', dokuError.response?.data || dokuError.message);
            // Fallback: kembalikan token lama agar tidak kehilangan order
            return res.status(201).json({
                paymentToken: order.paymentToken,
                orderNumber: order.orderNumber,
                status: order.status,
                paymentUrl: null,
                error: 'Terdapat kendala pada Payment Gateway (DOKU). Mohon cek kembali nomor HP Anda atau hubungi admin.',
            });
        }
    } catch (error) {
        console.error('Order creation error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

import { OrderService } from '../services/order-service';

/**
 * @swagger
 * /orders/{orderNumber}:
 *   get:
 *     summary: Get order by order number (With Auto-Polling for DOKU)
 */
router.get('/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        let order = await Order.findOne({ 
            where: { orderNumber },
            include: [
                {
                    model: Product,
                    as: 'product'
                },
                {
                    model: User,
                    as: 'affiliator',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // AUTO-POLLING: Jika masih pending, cek status ke DOKU via Gateway
        if (order.status === 'pending') {
            try {
                const dokuStatus = await checkDokuStatus(orderNumber);
                
                // Jika DOKU bilang SUCCESS di Gateway, update order di sini
                if (dokuStatus?.transaction?.status === 'SUCCESS') {
                    order = await OrderService.handleOrderPaid(orderNumber);
                }
            } catch (pollError: any) {
                // Silently ignore polling network errors
            }
        }

        return res.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        return res.status(500).json({ error: 'Failed to fetch order' });
    }
});

/**
 * @swagger
 * /orders/{orderNumber}:
 *   patch:
 *     summary: Update order status
 */
router.patch('/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const order = await Order.findOne({ where: { orderNumber } });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Handle Side Effects (Timestamps)
        const updateData: any = { status, updatedAt: new Date() };
        if (status === 'shipped') {
            updateData.shippedAt = new Date();
        } else if (status === 'completed') {
            updateData.completedAt = new Date();
        }

        // Jika status yang diupdate adalah 'paid', gunakan OrderService
        if (status === 'paid') {
            await OrderService.handleOrderPaid(orderNumber);
        } else {
            await order.update(updateData);
        }

        // Jika status adalah shipped/completed, kirim notifikasi manual
        if (status === 'shipped' || status === 'completed') {
            try {
                const affiliator = await User.findOne({ 
                    where: { [Op.or]: [{ id: order.affiliatorId }, { _id: order.affiliatorId }] }
                });
                if (affiliator?.email) {
                    if (status === 'shipped') {
                        await affiliatorNotifications.orderShipped(orderNumber, order.buyerName, affiliator.email);
                    } else {
                        await affiliatorNotifications.orderCompleted(orderNumber, order.buyerName, affiliator.email);
                    }
                }
            } catch (err) {
                console.error('❌ Notification error for status update:', err);
            }
        }

        return res.json({ message: `Order ${orderNumber} status updated to ${status}` });
    } catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ error: 'Failed to update order status' });
    }
});

export default router;
