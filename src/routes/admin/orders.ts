import express from 'express';
import clientPromise from '../../config/database';
import { ObjectId } from 'mongodb';
import { authenticateUser, requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: List all orders with product details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of orders
 *   put:
 *     summary: Update order status or shipping cost
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, paid, shipped, completed, cancelled]
 *               shippingCost:
 *                 type: number
 *     responses:
 *       200:
 *         description: Order updated
 *       404:
 *         description: Order not found
 */
// GET /api/admin/orders
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const orders = await db.collection('orders').aggregate([
            {
                $addFields: {
                    productIdObjectId: { $toObjectId: '$productId' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productIdObjectId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: {
                    path: '$productInfo',
                    preserveNullAndEmptyArrays: true // Keep orders even if product not found
                }
            },
            {
                $addFields: {
                    productName: '$productInfo.name',
                    productPrice: '$productInfo.price',
                    commissionType: '$productInfo.commissionType',
                    commissionValue: '$productInfo.commissionValue'
                }
            },
            {
                $project: {
                    productInfo: 0,
                    productIdObjectId: 0
                }
            }
        ]).sort({ createdAt: -1 }).toArray();

        const formattedOrders = orders.map(order => ({
            ...order,
            id: order._id.toString(),
        }));

        res.json(formattedOrders);
    } catch (error) {
        console.error('Error fetching admin orders:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// PUT /api/admin/orders - Update order status and shipping
router.put('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { orderId, status, shippingCost } = req.body;

        if (!orderId || (!status && shippingCost === undefined)) {
            return res.status(400).json({ error: 'orderId and status or shippingCost are required' });
        }

        const client = await clientPromise;
        const db = client.db();

        const updateFields: any = {};
        if (status) {
            updateFields.status = status;
        }
        if (shippingCost !== undefined) {
            updateFields.shippingCost = shippingCost;
        }
        if (Object.keys(updateFields).length > 0) {
            updateFields.updatedAt = new Date();
        }

        const result = await db.collection('orders').findOneAndUpdate(
            { _id: new ObjectId(orderId) },
            { $set: updateFields },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const updatedOrder = result;

        // If order is marked as paid, create the commission
        if (updatedOrder && status === 'paid') {
            // Check if commission already exists for this order
            const existingCommission = await db.collection('commissions').findOne({
                orderId: updatedOrder._id.toString()
            });

            if (!existingCommission) {
                const product = await db.collection('products').findOne({ _id: new ObjectId(updatedOrder.productId) });

                if (product) {
                    let commissionAmount = 0;
                    if (product.commissionType === 'percentage') {
                        commissionAmount = (Number(product.price) * Number(product.commissionValue)) / 100;
                    } else { // 'fixed'
                        commissionAmount = Number(product.commissionValue);
                    }

                    const commissionToInsert = {
                        affiliatorId: updatedOrder.affiliatorId,
                        affiliateName: updatedOrder.affiliateName,
                        orderId: updatedOrder._id.toString(),
                        productName: product.name,
                        amount: commissionAmount,
                        status: 'approved', // Auto-approved when order is paid
                        date: new Date(),
                        createdAt: new Date(),
                    };

                    await db.collection('commissions').insertOne(commissionToInsert);
                }
            }
        }

        // Add product details to the returned order (fetch again to get joined data)
        const finalOrder = await db.collection('orders').aggregate([
            { $match: { _id: new ObjectId(orderId) } },
            {
                $addFields: {
                    productIdObjectId: { $toObjectId: '$productId' }
                }
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productIdObjectId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: {
                    path: '$productInfo',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $addFields: {
                    productName: '$productInfo.name',
                    productPrice: '$productInfo.price',
                    commissionType: '$productInfo.commissionType',
                    commissionValue: '$productInfo.commissionValue'
                }
            },
            {
                $project: {
                    productInfo: 0,
                    productIdObjectId: 0
                }
            }
        ]).next();

        if (!finalOrder) {
            return res.status(500).json({ error: 'Failed to retrieve updated order details' });
        }

        const formattedOrder = {
            ...finalOrder,
            id: finalOrder._id.toString(),
        };

        res.json(formattedOrder);

    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
