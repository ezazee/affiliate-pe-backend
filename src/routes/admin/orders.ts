import express from 'express';
import { Order, Product, Commission } from '../../models';
import { authenticateUser, requireAuth } from '../../middleware/auth';
import { Op } from 'sequelize';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: List all orders with product details
 *     tags: [Admin]
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [{
                model: Product,
                as: 'product',
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });

        const formattedOrders = orders.map(order => {
            const rawOrder = order.toJSON() as any;
            const product = rawOrder.product;
            
            // Perkuat penanganan data: gunakan data denormalisasi di Order jika data Product tidak ditemukan
            return {
                ...rawOrder,
                productName: product?.name || rawOrder.productName || 'Produk Tidak Diketahui',
                productPrice: product?.price || rawOrder.productPrice || 0,
                commissionType: product?.commissionType || rawOrder.commissionType || 'percentage',
                commissionValue: product?.commissionValue || rawOrder.commissionValue || 0
            };
        });

        return res.json(formattedOrders);
    } catch (error: any) {
        console.error('❌ Error fetching admin orders:', error);
        // Kirim detail error ke frontend untuk memudahkan debug di console
        return res.status(500).json({ 
            error: 'Something went wrong', 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

/**
 * @swagger
 * /admin/orders:
 *   put:
 *     summary: Update order status or shipping cost
 *     tags: [Admin]
 */
router.put('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { orderId, status, shippingCost } = req.body;

        if (!orderId || (!status && shippingCost === undefined)) {
            return res.status(400).json({ error: 'orderId and status or shippingCost are required' });
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

        const order = await Order.findOne({
            where: {
                [Op.or]: [
                    { orderNumber: orderId },
                    ...(isUUID ? [{ id: orderId }] : []),
                    { _id: orderId }
                ]
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updateFields: any = {};
        if (status) {
            updateFields.status = status;
            
            const statusNoteMap: Record<string, string> = {
                'paid': 'Pembayaran dikonfirmasi manual oleh Admin.',
                'shipping': 'Pesanan diproses pengiriman oleh Admin.',
                'delivered': 'Pesanan ditandai selesai oleh Admin.',
                'cancelled': 'Pesanan dibatalkan oleh Admin.'
            };

            const newActivity = {
                status,
                timestamp: new Date(),
                note: statusNoteMap[status] || `Status diperbarui oleh Admin ke ${status}.`
            };
            
            updateFields.activityLog = [...(order.activityLog || []), newActivity];
        }
        if (shippingCost !== undefined) {
            updateFields.shippingCost = shippingCost;
        }
        updateFields.updatedAt = new Date();

        await order.update(updateFields);

        // If order is marked as paid/completed, create the commission if not exists
        if (status === 'paid' || status === 'completed') {
            const existingCommission = await Commission.findOne({
                where: { orderId: order.id }
            });

            if (!existingCommission) {
                const product = await Product.findByPk(order.productId);

                if (product) {
                    let commissionAmount = 0;
                    if (product.commissionType === 'percentage') {
                        commissionAmount = Math.round((Number(product.price) * Number(product.commissionValue)) / 100);
                    } else { // 'fixed'
                        commissionAmount = Number(product.commissionValue);
                    }

                    await Commission.create({
                        affiliatorId: order.affiliatorId,
                        affiliateName: order.affiliateName,
                        orderId: order.id,
                        productName: product.name,
                        amount: commissionAmount,
                        status: 'paid', // Auto-approved
                        date: new Date(),
                        createdAt: new Date(),
                    } as any);
                }
            }
        }

        // Return updated order with product details
        const updatedOrder = await Order.findOne({
            where: { id: order.id },
            include: [{
                model: Product,
                as: 'product',
                required: false
            }]
        });

        if (!updatedOrder) {
            return res.status(500).json({ error: 'Failed to retrieve updated order details' });
        }

        const product = (updatedOrder as any).product;
        const formattedOrder = {
            ...updatedOrder.toJSON(),
            productName: product?.name,
            productPrice: product?.price,
            commissionType: product?.commissionType,
            commissionValue: product?.commissionValue
        };

        res.json(formattedOrder);

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/orders/label/{orderId}:
 *   get:
 *     summary: Ambil label pengiriman dari Biteship
 *     tags: [Admin]
 */
router.get('/label/:orderId', requireAuth, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Check if orderId is a valid UUID to avoid Postgres error
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

        const order = await Order.findOne({
            where: {
                [Op.or]: [
                    { orderNumber: orderId },
                    ...(isUUID ? [{ id: orderId }] : []),
                    { _id: orderId }
                ]
            }
        });

        if (!order || !order.biteshipShipmentId) {
            return res.status(404).json({ error: 'Order atau Shipment ID tidak ditemukan' });
        }

        const gatewayUrl = process.env.PAYMENT_GATEWAY_URL;
        const gatewayKey = process.env.PAYMENT_GATEWAY_KEY;

        const response = await fetch(`${gatewayUrl}/shipping/label/${order.biteshipShipmentId}`, {
            headers: {
                'x-app-key': gatewayKey || ''
            }
        });

        const data: any = await response.json();
        console.log('📦 Biteship Label Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        // Cari URL label di berbagai kemungkinan field (Biteship v1 mengembalikan di shipping_label.file_url)
        const labelUrl = data.label_url || 
                         data.url || 
                         (data.shipping_label && data.shipping_label.file_url) ||
                         (data.data && (data.data.label_url || data.data.url));

        if (labelUrl) {
            return res.json({ label_url: labelUrl });
        }

        return res.status(404).json({ error: 'URL Label tidak ditemukan dalam respon Biteship', raw: data });
    } catch (error: any) {
        console.error('❌ Error proxying label request:', error);
        return res.status(500).json({ error: 'Gagal mengambil label dari gateway', details: error.message });
    }
});

export default router;
