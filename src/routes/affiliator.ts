import express from 'express';
import { Order, Commission, AffiliateLink, Product, User, LinkClick, Withdrawal, BundleItem } from '../models';
import { authenticateUser } from '../middleware/auth';
import { adminNotifications, affiliatorNotifications } from '../services/notification-service';
import { Op, Sequelize } from 'sequelize';
import db from '../config/database';

const router = express.Router();

// GET /affiliator/leaderboard
router.get('/leaderboard', async (req, res) => {
    try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const leaderboard = await Order.findAll({
            attributes: [
                'affiliatorId',
                [Sequelize.fn('COUNT', Sequelize.col('Order.id')), 'totalOrders'],
                [Sequelize.fn('SUM', Sequelize.col('totalPrice')), 'totalSales']
            ],
            where: {
                status: { [Op.notIn]: ['cancelled'] },
                createdAt: { [Op.gte]: startOfMonth }
            },
            include: [{
                model: User,
                as: 'affiliator',
                attributes: ['name', 'storeName', 'storeSlug'],
                required: true
            }],
            group: ['affiliatorId', 'affiliator.id'],
            order: [[Sequelize.literal('"totalOrders"'), 'DESC']],
            limit: 5
        });

        // Map to simpler format and hide sensitive data if needed
        const formattedLeaderboard = leaderboard.map((item: any, index: number) => {
            const data = item.get({ plain: true });
            return {
                rank: index + 1,
                name: data.affiliator?.name || 'Anonymous',
                storeName: data.affiliator?.storeName,
                storeSlug: data.affiliator?.storeSlug,
                totalOrders: parseInt(data.totalOrders),
                totalSales: parseFloat(data.totalSales || 0)
            };
        });

        return res.json(formattedLeaderboard);
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /affiliator/commissions
router.get('/commissions', async (req, res) => {
    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const userCommissions = await Commission.findAll({
            where: {
                [Op.or]: [{ affiliatorId: affiliatorId as string }, { _id: affiliatorId as string }]
            },
            include: [{
                model: Order,
                as: 'order',
                required: false
            }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });

        return res.json(userCommissions);
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
 */
router.get('/stats', async (req, res) => {
    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const whereClause = {
            [Op.or]: [{ affiliatorId: affiliatorId as string }, { _id: affiliatorId as string }]
        };

        const totalOrders = await Order.count({ where: whereClause });
        const commissions = await Commission.findAll({ where: whereClause });
        const linksCount = await AffiliateLink.count({ where: whereClause });

        const totalRevenue = commissions
            .filter((c: any) => !c.isPartial && ['approved', 'paid', 'withdrawn', 'processed'].includes(c.status))
            .reduce((sum: number, c: any) => sum + Number(c.amount), 0);
 
        const withdrawableBalance = commissions
            .filter((c: any) => !c.isPartial && c.status === 'paid')
            .reduce((sum: number, c: any) => {
                const usedAmount = Number(c.usedAmount) || 0;
                return sum + (Number(c.amount) - usedAmount);
            }, 0);
 
        const reservedBalance = commissions
            .filter((c: any) => c.status === 'reserved')
            .reduce((sum: number, c: any) => sum + Number(c.amount), 0);

        const conversionRate = totalOrders > 0 && linksCount > 0 ? (totalOrders / linksCount) * 100 : 0;

        return res.json({
            totalRevenue,
            withdrawableBalance,
            reservedBalance,
            totalOrders,
            conversionRate: conversionRate.toFixed(2),
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /affiliator/links:
 *   get:
 *     summary: Get affiliate links
 */
router.get('/links', async (req, res) => {
    const { affiliatorId } = req.query;

    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }

    try {
        const affiliator = await User.findOne({
            where: {
                [Op.or]: [{ id: affiliatorId as string }, { _id: affiliatorId as string }]
            }
        });
        
        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        if (affiliator.status !== 'approved') {
            return res.json([]);
        }

        const matchQuery = affiliatorId === 'all' ? {} : { 
            [Op.or]: [{ affiliatorId: affiliatorId as string }, { _id: affiliatorId as string }]
        };

        const userLinks = await AffiliateLink.findAll({
            where: matchQuery,
            attributes: {
                include: [
                    [
                        Sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM link_clicks AS lc
                            WHERE lc."linkId" = "AffiliateLink".id
                        )`),
                        'clicks'
                    ]
                ]
            },
            include: [{
                model: Product,
                as: 'product',
                required: false,
                include: [{
                    model: BundleItem,
                    as: 'bundleItems',
                    include: [{
                        model: Product,
                        as: 'componentProduct',
                        attributes: ['id', 'name', 'stock', 'isActive']
                    }]
                }]
            }]
        });

        return res.json(userLinks);
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

        const affiliator = await User.findOne({
            where: {
                [Op.or]: [{ id: affiliatorId }, { _id: affiliatorId }]
            }
        });
        
        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        if (affiliator.status !== 'approved') {
            return res.status(403).json({ error: 'Affiliator account is not approved yet' });
        }

        const product = await Product.findOne({
            where: {
                [Op.or]: [{ id: productId }, { _id: productId }]
            },
            include: [{
                model: BundleItem,
                as: 'bundleItems',
                include: [{
                    model: Product,
                    as: 'componentProduct',
                    attributes: ['id', 'name', 'stock', 'isActive']
                }]
            }]
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const existingLink = await AffiliateLink.findOne({ 
            where: { 
                affiliatorId: affiliator.id, 
                productId: product.id 
            } 
        });

        if (existingLink) {
            return res.status(409).json({ error: 'Affiliate link for this product already exists' });
        }

        const createdLink = await AffiliateLink.create({
            affiliatorId: affiliator.id,
            productId: product.id,
            isActive: isActive ?? true,
            showInStore: true, // Otomatis tampil di toko saat dibuat
            createdAt: new Date(),
        });

        const linkWithProduct = {
            ...createdLink.toJSON(),
            product: product.toJSON()
        };

        return res.status(201).json(linkWithProduct);
    } catch (error) {
        console.error('Error creating affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /affiliator/products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.findAll({ 
            where: { isActive: true },
            include: [{
                model: BundleItem,
                as: 'bundleItems',
                include: [{
                    model: Product,
                    as: 'componentProduct',
                    attributes: ['id', 'name', 'stock', 'isActive']
                }]
            }]
        });
        return res.json(products);
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
        const withdrawals = await Withdrawal.findAll({
            where: {
                [Op.or]: [{ affiliatorId: affiliatorId as string }, { _id: affiliatorId as string }]
            },
            order: [['requestedAt', 'DESC']]
        });

        return res.json(withdrawals);
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// POST /affiliator/withdrawals
router.post('/withdrawals', async (req, res) => {
    const t = await db.transaction(); // Use transaction for multi-step withdrawal
    try {
        const { affiliatorId, amount, bankDetails } = req.body;

        if (!affiliatorId || !amount || !bankDetails) {
            await t.rollback();
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const requestedAmount = Number(amount);
        if (isNaN(requestedAmount) || requestedAmount <= 0) {
            await t.rollback();
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }

        const affiliator = await User.findOne({
            where: {
                [Op.or]: [{ id: affiliatorId }, { _id: affiliatorId }]
            },
            transaction: t
        });

        if (!affiliator) {
            await t.rollback();
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        // Fetch minimum withdrawal from settings (placeholder or model if exists)
        // Assuming settings.findOne is still needed or we have a Settings model
        // For now, hardcode or check if Settings model exists.
        const minimumWithdrawalAmount = 10000;

        if (requestedAmount < minimumWithdrawalAmount) {
            await t.rollback();
            return res.status(400).json({ error: `Minimum withdrawal amount is Rp${minimumWithdrawalAmount.toLocaleString('id-ID')}` });
        }

        // 1. Calculate withdrawable balance
        const availableCommissions = await Commission.findAll({
            where: {
                affiliatorId: affiliator.id,
                status: 'paid'
            },
            order: [['date', 'ASC']],
            transaction: t
        });

        const withdrawableBalance = availableCommissions.reduce((sum, commission) => {
            const usedAmount = Number(commission.usedAmount) || 0;
            return sum + (Number(commission.amount) - usedAmount);
        }, 0);

        // 2. Check if balance is sufficient
        if (requestedAmount > withdrawableBalance) {
            await t.rollback();
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // 3. Create withdrawal request
        const newWithdrawal = await Withdrawal.create({
            affiliatorId: affiliator.id,
            amount: requestedAmount,
            bankDetails,
            status: 'pending',
            requestedAt: new Date(),
            activityLog: [{
                status: 'pending',
                timestamp: new Date(),
                note: 'Permintaan penarikan dana diajukan oleh affiliator'
            }]
        }, { transaction: t });

        // 4. Process reserved commissions
        let amountToCover = requestedAmount;
        const reservedCommissionIds = [];

        for (const commission of availableCommissions) {
            if (amountToCover <= 0) break;

            const usedAmount = Number(commission.usedAmount) || 0;
            const availableBalance = Number(commission.amount) - usedAmount;

            if (availableBalance <= 0) continue;

            const amountToUse = Math.min(amountToCover, availableBalance);

            // Create reserved commission record
            const reservedCommission = await Commission.create({
                affiliatorId: affiliator.id,
                affiliateName: commission.affiliateName,
                orderId: commission.orderId,
                productName: commission.productName,
                amount: amountToUse,
                status: 'reserved',
                withdrawalId: newWithdrawal.id,
                createdAt: commission.createdAt || new Date(),
                date: commission.date || new Date(),
                isPartial: true,
                parentCommissionId: commission.id,
            } as any, { transaction: t });

            // Update usedAmount on parent commission
            await commission.update({
                usedAmount: usedAmount + amountToUse
            }, { transaction: t });

            reservedCommissionIds.push({
                commissionId: commission.id,
                amount: amountToUse,
                reservedCommissionId: reservedCommission.id
            });

            amountToCover -= amountToUse;
        }

        await t.commit();

        // Notifications
        try {
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
        } catch (notificationError) {
            console.error('❌ Failed to send notifications for withdrawal:', notificationError);
        }

        return res.status(201).json(newWithdrawal);

    } catch (error) {
        if (t) await t.rollback();
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
        const orders = await Order.findAll({
            where: {
                [Op.or]: [{ affiliatorId: affiliatorId as string }, { _id: affiliatorId as string }]
            },
            include: [{
                model: Product,
                as: 'product',
                required: false
            }],
            order: [['createdAt', 'DESC']]
        });

        const formattedOrders = orders.map((order: any) => {
            const product = (order as any).product;
            let commission = 0;
            if (order.status !== 'cancelled' && product) {
                if (product.commissionType === 'percentage') {
                    commission = Math.round(Number(product.price) * (Number(product.commissionValue) / 100));
                } else if (product.commissionType === 'fixed') {
                    commission = Number(product.commissionValue) || 0;
                }
            }
 
            const orderJson = order.toJSON();
            delete orderJson.trackingUrl;
 
            return {
                ...orderJson,
                productName: product?.name || null,
                productPrice: product?.price || 0,
                commission: commission
            };
        });

        return res.json(formattedOrders);
    } catch (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /affiliator/orders/:orderId
router.get('/orders/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { affiliatorId } = req.query;

    if (!orderId || !affiliatorId) {
        return res.status(400).json({ error: 'orderId and affiliatorId are required' });
    }

    try {
        const order = await Order.findOne({
            where: {
                [Op.and]: [
                    { [Op.or]: [{ id: orderId }, { _id: orderId }] },
                    { [Op.or]: [{ affiliatorId: affiliatorId as string }, { _id: affiliatorId as string }] }
                ]
            },
            include: [{
                model: Product,
                as: 'product',
                required: false
            }]
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found or access denied' });
        }

        const product = (order as any).product;
        let commission = 0;
        if (order.status !== 'cancelled' && product) {
            if (product.commissionType === 'percentage') {
                commission = Math.round(Number(product.price) * (Number(product.commissionValue) / 100));
            } else if (product.commissionType === 'fixed') {
                commission = Number(product.commissionValue) || 0;
            }
        }

        const orderJson = order.toJSON();
        delete orderJson.trackingUrl;

        const formattedOrder = {
            ...orderJson,
            productName: product?.name || null,
            productPrice: product?.price || 0,
            commission: commission
        };

        return res.json(formattedOrder);
    } catch (error) {
        console.error('Error fetching order detail:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /affiliator/link-performance:
 *   get:
 *     summary: Get link performance analytics
 */
router.get('/link-performance', async (req, res) => {
    const { affiliatorId, startDate, endDate, groupBy = 'day' } = req.query;

    if (!affiliatorId) return res.status(400).json({ error: 'affiliatorId is required' });
    if (!startDate || !endDate) return res.status(400).json({ error: 'startDate and endDate are required' });

    // Validate groupBy
    const validGroupings = ['day', 'week', 'month'];
    const grouping = validGroupings.includes(groupBy as string) ? groupBy as string : 'day';

    try {
        const affiliateLinks = await AffiliateLink.findAll({
            where: {
                [Op.or]: [{ affiliatorId: affiliatorId as string }, { _id: affiliatorId as string }]
            },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['name']
            }]
        });

        if (affiliateLinks.length === 0) return res.json([]);

        const linkIds = affiliateLinks.map(link => link.id);
        const linkMap = new Map(affiliateLinks.map(link => [link.id, (link as any).product?.name || 'Unknown Product']));

        // Fix date range to include the full end day
        const endOfPeriod = new Date(endDate as string);
        endOfPeriod.setHours(23, 59, 59, 999);

        // Click data aggregation
        const clickData = await LinkClick.findAll({
            attributes: [
                [Sequelize.fn('date_trunc', grouping, Sequelize.col('createdAt')), 'date'],
                'linkId',
                [Sequelize.fn('count', Sequelize.col('id')), 'clicks']
            ],
            where: {
                linkId: { [Op.in]: linkIds },
                createdAt: {
                    [Op.gte]: new Date(startDate as string),
                    [Op.lte]: endOfPeriod
                }
            },
            group: [Sequelize.fn('date_trunc', grouping, Sequelize.col('createdAt')), 'linkId'],
            order: [[Sequelize.fn('date_trunc', grouping, Sequelize.col('createdAt')), 'ASC']]
        });

        const formattedData = clickData.map(item => {
            const data = item.toJSON() as any;
            return {
                date: data.date.toISOString().split('T')[0],
                linkId: data.linkId,
                clicks: Number(data.clicks),
                productName: linkMap.get(data.linkId) || 'Unknown Product'
            };
        });

        return res.json(formattedData);
    } catch (error) {
        console.error('Error fetching link performance data:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /affiliator/links/{id}:
 *   put:
 *     summary: Update affiliate link status
 */
router.put('/links/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const link = await AffiliateLink.findOne({
            where: {
                [Op.or]: [{ id: id }, { _id: id }]
            }
        });

        if (!link) {
            return res.status(404).json({ error: 'Link not found' });
        }

        await link.update({ isActive, updatedAt: new Date() });

        return res.json(link);
    } catch (error) {
        console.error('Error updating affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /affiliator/links/{id}:
 *   delete:
 *     summary: Delete affiliate link
 */
router.delete('/links/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const link = await AffiliateLink.findOne({
            where: {
                [Op.or]: [{ id: id }, { _id: id }]
            }
        });

        if (!link) {
            return res.status(404).json({ error: 'Link not found' });
        }

        await link.destroy();

        return res.json({ message: 'Link deleted successfully' });
    } catch (error) {
        console.error('Error deleting affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /affiliator/store-settings:
 *   get:
 *     summary: Get storefront settings for the current affiliator
 *     tags: [Affiliator]
 */
router.get('/store-settings', async (req, res) => {
    const { affiliatorId } = req.query;
    if (!affiliatorId) return res.status(400).json({ error: 'affiliatorId is required' });

    try {
        const user = await User.findOne({
            where: { [Op.or]: [{ id: affiliatorId as string }, { _id: affiliatorId as string }] },
            attributes: ['storeName', 'storeSlug', 'storeBio', 'storeThemeColor', 'storeSocialLinks']
        });
        return res.json(user);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * @swagger
 * /affiliator/store-settings:
 *   patch:
 *     summary: Update storefront settings
 *     tags: [Affiliator]
 */
router.patch('/store-settings', async (req, res) => {
    try {
        const { affiliatorId, storeName, storeSlug, storeBio, storeThemeColor, storeSocialLinks } = req.body;

        if (!affiliatorId) return res.status(400).json({ error: 'affiliatorId is required' });

        const user = await User.findOne({
            where: { [Op.or]: [{ id: affiliatorId }, { _id: affiliatorId }] }
        });

        if (!user) return res.status(404).json({ error: 'Affiliator not found' });

        // Update data
        await user.update({
            storeName,
            storeSlug: storeSlug?.toLowerCase().replace(/\s+/g, '-'),
            storeBio,
            storeThemeColor,
            storeSocialLinks
        });

        return res.json({ message: 'Store settings updated successfully', profile: user });
    } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: 'Slug sudah digunakan oleh user lain' });
        }
        return res.status(500).json({ error: 'Failed to update settings' });
    }
});

/**
 * @swagger
 * /affiliator/links/{id}/toggle-store:
 *   patch:
 *     summary: Toggle product visibility in storefront
 *     tags: [Affiliator]
 */
router.patch('/links/:id/toggle-store', async (req, res) => {
    try {
        const { id } = req.params;
        const { showInStore } = req.body;

        const link = await AffiliateLink.findOne({
            where: { [Op.or]: [{ id: id }, { _id: id }] }
        });

        if (!link) return res.status(404).json({ error: 'Link not found' });

        await link.update({ showInStore });

        return res.json({ message: 'Visibility updated', showInStore: link.showInStore });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to update visibility' });
    }
});


export default router;
