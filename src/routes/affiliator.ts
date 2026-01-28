import express from 'express';
import clientPromise from '../config/database';
import { ObjectId } from 'mongodb';
import { Order, Commission, AffiliateLink, Product } from '../types';
import { authenticateUser } from '../middleware/auth';
import { adminNotifications, affiliatorNotifications } from '../services/notification-service';

const router = express.Router();

// GET /affiliator/commissions
/**
 * @swagger
 * tags:
 *   name: Affiliator
 *   description: Endpoint khusus Afiliator
 */

/**
 * @swagger
 * /affiliator/commissions:
 *   get:
 *     summary: Get commissions for an affiliator
 *     tags: [Affiliator]
 *     parameters:
 *       - in: query
 *         name: affiliatorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of commissions
 */
router.get('/commissions', async (req, res) => {
    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const userCommissions = await db.collection('commissions').aggregate([
            { $match: { affiliatorId } },
            {
                $addFields: {
                    orderIdObjectId: { $toObjectId: '$orderId' }
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'orderIdObjectId',
                    foreignField: '_id',
                    as: 'order'
                }
            },
            {
                $unwind: {
                    path: '$order',
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    orderIdObjectId: 0
                }
            }
        ])
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        const formattedCommissions = userCommissions.map(commission => {
            return {
                ...commission,
                id: commission._id.toString(),
            };
        });

        return res.json(formattedCommissions);
    } catch (error) {
        console.error('Error fetching commissions:', error)
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /affiliator/stats:
 *   get:
 *     summary: Get dashboard stats for an affiliator
 *     tags: [Affiliator]
 *     parameters:
 *       - in: query
 *         name: affiliatorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Affiliator statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalRevenue:
 *                   type: number
 *                 withdrawableBalance:
 *                   type: number
 *                 reservedBalance:
 *                   type: number
 *                 totalOrders:
 *                   type: number
 *                 conversionRate:
 *                   type: string
 */
router.get('/stats', async (req, res) => {
    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const userOrders = (await db.collection<Order>('orders').find({ affiliatorId }).toArray()).map(order => ({ ...order, id: order._id.toString() }));
        const userCommissions = (await db.collection<Commission>('commissions').find({ affiliatorId }).toArray()).map(commission => ({ ...commission, id: commission._id.toString() }));
        const userLinks = (await db.collection<AffiliateLink>('affiliateLinks').find({ affiliatorId }).toArray()).map(link => ({ ...link, id: link._id.toString() }));

        const totalRevenue = userCommissions
            .filter(c => !c.isPartial && (c.status === 'approved' || c.status === 'paid' || c.status === 'withdrawn' || c.status === 'processed'))
            .reduce((sum, commission) => sum + commission.amount, 0);

        const withdrawableBalance = userCommissions
            .filter(c => !c.isPartial && c.status === 'paid')
            .reduce((sum, commission) => {
                const usedAmount = commission.usedAmount || 0;
                return sum + (commission.amount - usedAmount);
            }, 0);

        const reservedBalance = userCommissions
            .filter(c => c.status === 'reserved')
            .reduce((sum, commission) => sum + commission.amount, 0);

        const conversionRate = userOrders.length > 0 && userLinks.length > 0 ? (userOrders.length / userLinks.length) * 100 : 0;

        return res.json({
            totalRevenue,
            withdrawableBalance,
            reservedBalance,
            totalOrders: userOrders.length,
            conversionRate: conversionRate.toFixed(2),
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /affiliator/links
/**
 * @swagger
 * /affiliator/links:
 *   get:
 *     summary: Get affiliate links
 *     tags: [Affiliator]
 *     parameters:
 *       - in: query
 *         name: affiliatorId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of affiliate links
 */
router.get('/links', async (req, res) => {

    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const affiliator = await db.collection('users').findOne({ _id: new ObjectId(affiliatorId as string) });
        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        if (affiliator.status !== 'approved') {
            return res.json([]);
        }

        const matchQuery = affiliatorId === 'all' ? {} : { affiliatorId };

        const userLinksRaw = await db.collection<AffiliateLink>('affiliateLinks').find(matchQuery).toArray();
        const userLinks = userLinksRaw.map(link => ({ ...link, id: link._id.toString() }));

        const productIds = userLinks.map(link => link.productId);

        // Note: In original code productIds are strings (canonical IDs) but query uses ObjectId. 
        // Wait, the original code used: `_id: { $in: productIds.map(id => new ObjectId(id)) }`
        // This implies productId in link IS an ObjectId string. 
        // BUT POST route says: `const canonicalProductId = productId;` where productId comes from body.
        // If productId in body is canonical "product1", then `new ObjectId("product1")` will fail.
        // However, usually productId is an ObjectId string. Let's assume it is.
        // Ideally we should check if it's a valid ObjectId before casting.

        const validProductIds = productIds.filter(pid => ObjectId.isValid(pid)).map(id => new ObjectId(id));

        const productsRaw = await db.collection<Product>('products').find({ _id: { $in: validProductIds } }).toArray();
        const products = productsRaw.map(p => ({ ...p, id: p._id.toString() }));

        const linksWithProducts = userLinks.map(link => {
            const product = products.find(p => p.id === link.productId);
            return {
                ...link,
                product: product,
            };
        });

        return res.json(linksWithProducts);
    } catch (error) {
        console.error('Error fetching affiliate links:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// POST /affiliator/links
router.post('/links', async (req, res) => {
    try {
        const { affiliatorId, productId, isActive } = req.body;

        if (!affiliatorId || !productId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const client = await clientPromise;
        const db = client.db();

        const affiliator = await db.collection('users').findOne({ _id: new ObjectId(affiliatorId) });
        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        if (affiliator.status !== 'approved') {
            return res.status(403).json({ error: 'Affiliator account is not approved yet' });
        }

        const affiliateLinksCollection = db.collection('affiliateLinks');
        const canonicalProductId = productId; // Assuming string ID

        const existingLink = await affiliateLinksCollection.findOne({ affiliatorId, productId: canonicalProductId });

        if (existingLink) {
            return res.status(409).json({ error: 'Affiliate link for this product already exists' });
        }

        const newLink = {
            affiliatorId,
            productId: canonicalProductId,
            isActive: isActive ?? true,
            createdAt: new Date(),
        };

        const result = await db.collection('affiliateLinks').insertOne(newLink);
        const insertedId = result.insertedId;

        const createdLink = await db.collection('affiliateLinks').findOne({ _id: insertedId });
        if (!createdLink) {
            return res.status(500).json({ error: 'Failed to retrieve created link' });
        }

        // Try to fetch product if ID is valid ObjectId
        let product = null;
        if (ObjectId.isValid(createdLink.productId)) {
            product = await db.collection('products').findOne({ _id: new ObjectId(createdLink.productId) });
        }

        const formattedLink = { ...createdLink, id: createdLink._id.toString(), product: product ? { ...product, id: product._id.toString() } : null };

        return res.status(201).json(formattedLink);
    } catch (error) {
        console.error('Error creating affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /affiliator/products - reusing products logic but maybe specific to affiliator if needed
// For now, mirroring the simple list
router.get('/products', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();
        const products = await db.collection<Product>('products').find({ isActive: true }).toArray();
        const productsWithId = products.map((p) => ({
            ...p,
            id: p._id?.toString(),
        }));
        return res.json(productsWithId);
    } catch (error) {
        console.error('Error fetching affiliator products:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});


// GET /affiliator/withdrawals
router.get('/withdrawals', async (req, res) => {
    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const withdrawals = await db.collection('withdrawals')
            .find({ affiliatorId })
            .sort({ requestedAt: -1 })
            .toArray();

        const formattedWithdrawals = withdrawals.map(w => ({ ...w, id: w._id.toString() }));

        return res.json(formattedWithdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// POST /affiliator/withdrawals
router.post('/withdrawals', async (req, res) => {
    try {
        const { affiliatorId, amount, bankDetails } = req.body;

        if (!affiliatorId || !amount || !bankDetails) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const requestedAmount = Number(amount);
        if (isNaN(requestedAmount) || requestedAmount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        const client = await clientPromise;
        const db = client.db();

        // Fetch minimum withdrawal from settings
        const settingsCollection = db.collection('settings');
        const minimumWithdrawalSetting = await settingsCollection.findOne({ name: 'minimumWithdrawal' });
        const minimumWithdrawalAmount = minimumWithdrawalSetting?.value || 10000;

        if (requestedAmount < minimumWithdrawalAmount) {
            return res.status(400).json({ error: `Minimum withdrawal amount is Rp${minimumWithdrawalAmount.toLocaleString('id-ID')}` });
        }

        const commissionsCollection = db.collection('commissions');
        const withdrawalsCollection = db.collection('withdrawals');

        // 1. Calculate withdrawable balance
        const availableCommissions = await commissionsCollection.find({
            affiliatorId,
            status: 'paid'
        }).sort({ date: 1 }).toArray();

        const withdrawableBalance = availableCommissions.reduce((sum, commission) => {
            const usedAmount = commission.usedAmount || 0;
            const remainingBalance = commission.amount - usedAmount;
            return sum + remainingBalance;
        }, 0);

        // 2. Check if balance is sufficient
        if (requestedAmount > withdrawableBalance) {
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // 3. Create withdrawal request
        const newWithdrawal = {
            affiliatorId,
            amount: requestedAmount,
            bankDetails,
            status: 'approved', // Auto-approve/Processing
            requestedAt: new Date(),
        };

        const result = await withdrawalsCollection.insertOne(newWithdrawal);

        // Get affiliator info for notifications
        const affiliator = await db.collection('users').findOne({ _id: new ObjectId(affiliatorId) });

        // 4. Process reserved commissions
        let amountToCover = requestedAmount;
        const reservedCommissionIds = [];

        for (const commission of availableCommissions) {
            if (amountToCover <= 0) break;

            const usedAmount = commission.usedAmount || 0;
            const availableBalance = commission.amount - usedAmount;

            if (availableBalance <= 0) continue;

            const amountToUse = Math.min(amountToCover, availableBalance);

            // Create reserved commission
            const reservedCommission = {
                affiliatorId,
                orderId: commission.orderId,
                productName: commission.productName,
                amount: amountToUse,
                status: 'reserved',
                withdrawalId: result.insertedId.toString(),
                createdAt: commission.createdAt,
                date: commission.date,
                isPartial: true,
                parentCommissionId: commission._id.toString(),
            };

            const reservedResult = await db.collection('commissions').insertOne(reservedCommission);

            // Update usedAmount
            const newUsedAmount = usedAmount + amountToUse;
            await commissionsCollection.updateOne(
                { _id: commission._id },
                { $set: { usedAmount: newUsedAmount } }
            );

            reservedCommissionIds.push({
                commissionId: commission._id.toString(),
                amount: amountToUse,
                reservedCommissionId: reservedResult.insertedId.toString()
            });

            amountToCover -= amountToUse;
        }

        // Transaction log
        await db.collection('withdrawal_transactions').insertOne({
            withdrawalId: result.insertedId.toString(),
            affiliatorId,
            totalAmount: requestedAmount,
            reservedCommissions: reservedCommissionIds,
            createdAt: new Date(),
        });

        // Notifications (using imported services)

        try {
            if (affiliator && affiliator.email) {
                await adminNotifications.withdrawalRequest(
                    affiliator.name,
                    requestedAmount.toLocaleString('id-ID')
                );

                await affiliatorNotifications.withdrawalApproved(
                    requestedAmount.toLocaleString('id-ID'),
                    new Date().toLocaleString('id-ID'),
                    affiliator.email
                );

                const remainingBalance = withdrawableBalance - requestedAmount;
                await affiliatorNotifications.balanceUpdated(
                    remainingBalance.toLocaleString('id-ID'),
                    affiliator.email
                );
            }
        } catch (notificationError) {
            console.error('❌ Failed to send notifications for withdrawal:', notificationError);
        }

        const insertedWithdrawal = { ...newWithdrawal, id: result.insertedId.toString() };
        return res.status(201).json(insertedWithdrawal);

    } catch (error) {
        console.error('Error creating withdrawal request:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /affiliator/customers
router.get('/customers', async (req, res) => {
    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const client = await clientPromise;
        const db = client.db();

        const orders = await db.collection('orders').find({ affiliatorId }).sort({ createdAt: -1 }).toArray();

        // Should ideally mock productMap logic or efficient lookup
        // Doing basic loop for now
        const allProducts = await db.collection('products').find().toArray();
        const productMap = new Map();
        allProducts.forEach(product => {
            productMap.set(product._id.toString(), product);
        });

        const ordersWithProducts = orders.map(order => {
            const product = productMap.get(order.productId);
            let commission = 0;
            if (order.status !== 'cancelled' && product) {
                if (product.commissionType === 'percentage') {
                    commission = Math.round(Number(product.price) * (Number(product.commissionValue) / 100));
                } else if (product.commissionType === 'fixed') {
                    commission = Number(product.commissionValue) || 0;
                }
            }

            return {
                ...order,
                id: order._id?.toString(),
                productName: product?.name || null,
                product: product || null,
                productPrice: product?.price || 0,
                commission: commission
            };
        });

        return res.json(ordersWithProducts);
    } catch (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /affiliator/link-performance
/**
 * @swagger
 * /affiliator/link-performance:
 *   get:
 *     summary: Get link performance analytics
 *     tags: [Affiliator]
 *     parameters:
 *       - in: query
 *         name: affiliatorId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link performance data
 */
router.get('/link-performance', async (req, res) => {
    const { affiliatorId, startDate, endDate, timezone = 'Asia/Jakarta' } = req.query;

    if (!affiliatorId) return res.status(400).json({ error: 'affiliatorId is required' });
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    try {
        const client = await clientPromise;
        const db = client.db();

        const affiliateLinks = await db.collection('affiliateLinks').find({ affiliatorId }).toArray();
        if (affiliateLinks.length === 0) return res.json([]);

        // Get product names
        const productIds = affiliateLinks.map(link => {
            // Handle productId type safely (string vs ObjectId)
            return ObjectId.isValid(link.productId) ? new ObjectId(link.productId) : link.productId;
        }).filter(id => id instanceof ObjectId); // Filter only valid ObjectIds if schema mixed

        // If productIds are strings in links but ObjectIds in products collection:
        const products = await db.collection('products').find({ _id: { $in: productIds } }).toArray();
        const productMap = new Map(products.map(p => [p._id.toString(), p.name]));

        const linkIds = affiliateLinks.map(link => link._id);
        const linkMap = new Map(affiliateLinks.map(link => [link._id.toString(), productMap.get(link.productId.toString()) || 'Unknown Product']));

        const clickData = await db.collection('link_clicks').aggregate([
            {
                $match: {
                    linkId: { $in: linkIds },
                },
            },
            {
                $addFields: {
                    convertedDate: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$createdAt",
                            timezone: timezone as string
                        }
                    }
                }
            },
            {
                $match: {
                    convertedDate: {
                        $gte: startDate,
                        $lte: endDate,
                    },
                },
            },
            {
                $group: {
                    _id: {
                        date: '$convertedDate',
                        linkId: '$linkId'
                    },
                    clicks: { $sum: 1 },
                },
            },
            {
                $sort: { '_id.date': 1 },
            },
            {
                $project: {
                    _id: 0,
                    date: '$_id.date',
                    linkId: '$_id.linkId',
                    clicks: 1,
                },
            },
        ]).toArray();

        // Add product names to the result
        const enrichedData = clickData.map(item => ({
            ...item,
            productName: linkMap.get(item.linkId.toString()) || 'Unknown Product'
        }));

        return res.json(enrichedData);
    } catch (error) {
        console.error('Error fetching link performance data:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// PUT /affiliator/links/:id
/**
 * @swagger
 * /affiliator/links/{id}:
 *   put:
 *     summary: Update affiliate link status
 *     tags: [Affiliator]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Link updated
 */
router.put('/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (!id || !ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection('affiliateLinks').updateOne(
            { _id: new ObjectId(id) },
            { $set: { isActive, updatedAt: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        const updatedLink = await db.collection('affiliateLinks').findOne({ _id: new ObjectId(id) });
        const formattedLink = updatedLink ? { ...updatedLink, id: updatedLink._id.toString() } : null;

        return res.json(formattedLink);
    } catch (error) {
        console.error('Error updating affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// DELETE /affiliator/links/:id
/**
 * @swagger
 * /affiliator/links/{id}:
 *   delete:
 *     summary: Delete affiliate link
 *     tags: [Affiliator]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Link deleted
 */
router.delete('/links/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id || !ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection('affiliateLinks').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }

        return res.json({ message: 'Link deleted successfully' });
    } catch (error) {
        console.error('Error deleting affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
