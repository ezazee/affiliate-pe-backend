import express from 'express';
import { Order, Product, Commission } from '../../models';
import { authenticateUser, requireAuth } from '../../middleware/auth';
import { Op } from 'sequelize';

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

        const order = await Order.findOne({
            where: {
                [Op.or]: [{ id: orderId }, { _id: orderId }]
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updateFields: any = {};
        if (status) {
            updateFields.status = status;
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

export default router;
