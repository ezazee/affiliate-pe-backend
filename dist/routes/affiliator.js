"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const mongodb_1 = require("mongodb");
const notification_service_1 = require("../services/notification-service");
const router = express_1.default.Router();
// GET /affiliator/commissions
/**
 * @swagger
 * tags:
 *   name: Affiliator
 *   description: Affiliator specific endpoints
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
router.get('/commissions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { affiliatorId } = req.query;
    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }
    try {
        const client = yield database_1.default;
        const db = client.db();
        const userCommissions = yield db.collection('commissions').aggregate([
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
            return Object.assign(Object.assign({}, commission), { id: commission._id.toString() });
        });
        return res.json(formattedCommissions);
    }
    catch (error) {
        console.error('Error fetching commissions:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
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
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { affiliatorId } = req.query;
    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }
    try {
        const client = yield database_1.default;
        const db = client.db();
        const userOrders = (yield db.collection('orders').find({ affiliatorId }).toArray()).map(order => (Object.assign(Object.assign({}, order), { id: order._id.toString() })));
        const userCommissions = (yield db.collection('commissions').find({ affiliatorId }).toArray()).map(commission => (Object.assign(Object.assign({}, commission), { id: commission._id.toString() })));
        const userLinks = (yield db.collection('affiliateLinks').find({ affiliatorId }).toArray()).map(link => (Object.assign(Object.assign({}, link), { id: link._id.toString() })));
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
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
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
router.get('/links', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { affiliatorId } = req.query;
    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }
    try {
        const client = yield database_1.default;
        const db = client.db();
        const affiliator = yield db.collection('users').findOne({ _id: new mongodb_1.ObjectId(affiliatorId) });
        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }
        if (affiliator.status !== 'approved') {
            return res.json([]);
        }
        const matchQuery = affiliatorId === 'all' ? {} : { affiliatorId };
        const userLinksRaw = yield db.collection('affiliateLinks').find(matchQuery).toArray();
        const userLinks = userLinksRaw.map(link => (Object.assign(Object.assign({}, link), { id: link._id.toString() })));
        const productIds = userLinks.map(link => link.productId);
        // Note: In original code productIds are strings (canonical IDs) but query uses ObjectId. 
        // Wait, the original code used: `_id: { $in: productIds.map(id => new ObjectId(id)) }`
        // This implies productId in link IS an ObjectId string. 
        // BUT POST route says: `const canonicalProductId = productId;` where productId comes from body.
        // If productId in body is canonical "product1", then `new ObjectId("product1")` will fail.
        // However, usually productId is an ObjectId string. Let's assume it is.
        // Ideally we should check if it's a valid ObjectId before casting.
        const validProductIds = productIds.filter(pid => mongodb_1.ObjectId.isValid(pid)).map(id => new mongodb_1.ObjectId(id));
        const productsRaw = yield db.collection('products').find({ _id: { $in: validProductIds } }).toArray();
        const products = productsRaw.map(p => (Object.assign(Object.assign({}, p), { id: p._id.toString() })));
        const linksWithProducts = userLinks.map(link => {
            const product = products.find(p => p.id === link.productId);
            return Object.assign(Object.assign({}, link), { product: product });
        });
        return res.json(linksWithProducts);
    }
    catch (error) {
        console.error('Error fetching affiliate links:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// POST /affiliator/links
router.post('/links', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { affiliatorId, productId, isActive } = req.body;
        if (!affiliatorId || !productId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const affiliator = yield db.collection('users').findOne({ _id: new mongodb_1.ObjectId(affiliatorId) });
        if (!affiliator) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }
        if (affiliator.status !== 'approved') {
            return res.status(403).json({ error: 'Affiliator account is not approved yet' });
        }
        const affiliateLinksCollection = db.collection('affiliateLinks');
        const canonicalProductId = productId; // Assuming string ID
        const existingLink = yield affiliateLinksCollection.findOne({ affiliatorId, productId: canonicalProductId });
        if (existingLink) {
            return res.status(409).json({ error: 'Affiliate link for this product already exists' });
        }
        const newLink = {
            affiliatorId,
            productId: canonicalProductId,
            isActive: isActive !== null && isActive !== void 0 ? isActive : true,
            createdAt: new Date(),
        };
        const result = yield db.collection('affiliateLinks').insertOne(newLink);
        const insertedId = result.insertedId;
        const createdLink = yield db.collection('affiliateLinks').findOne({ _id: insertedId });
        if (!createdLink) {
            return res.status(500).json({ error: 'Failed to retrieve created link' });
        }
        // Try to fetch product if ID is valid ObjectId
        let product = null;
        if (mongodb_1.ObjectId.isValid(createdLink.productId)) {
            product = yield db.collection('products').findOne({ _id: new mongodb_1.ObjectId(createdLink.productId) });
        }
        const formattedLink = Object.assign(Object.assign({}, createdLink), { id: createdLink._id.toString(), product: product ? Object.assign(Object.assign({}, product), { id: product._id.toString() }) : null });
        return res.status(201).json(formattedLink);
    }
    catch (error) {
        console.error('Error creating affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// GET /affiliator/products - reusing products logic but maybe specific to affiliator if needed
// For now, mirroring the simple list
router.get('/products', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const products = yield db.collection('products').find({ isActive: true }).toArray();
        const productsWithId = products.map((p) => {
            var _a;
            return (Object.assign(Object.assign({}, p), { id: (_a = p._id) === null || _a === void 0 ? void 0 : _a.toString() }));
        });
        return res.json(productsWithId);
    }
    catch (error) {
        console.error('Error fetching affiliator products:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// GET /affiliator/withdrawals
router.get('/withdrawals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { affiliatorId } = req.query;
    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }
    try {
        const client = yield database_1.default;
        const db = client.db();
        const withdrawals = yield db.collection('withdrawals')
            .find({ affiliatorId })
            .sort({ requestedAt: -1 })
            .toArray();
        const formattedWithdrawals = withdrawals.map(w => (Object.assign(Object.assign({}, w), { id: w._id.toString() })));
        return res.json(formattedWithdrawals);
    }
    catch (error) {
        console.error('Error fetching withdrawals:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// POST /affiliator/withdrawals
router.post('/withdrawals', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { affiliatorId, amount, bankDetails } = req.body;
        if (!affiliatorId || !amount || !bankDetails) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const requestedAmount = Number(amount);
        if (isNaN(requestedAmount) || requestedAmount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal amount' });
        }
        const client = yield database_1.default;
        const db = client.db();
        // Fetch minimum withdrawal from settings
        const settingsCollection = db.collection('settings');
        const minimumWithdrawalSetting = yield settingsCollection.findOne({ name: 'minimumWithdrawal' });
        const minimumWithdrawalAmount = (minimumWithdrawalSetting === null || minimumWithdrawalSetting === void 0 ? void 0 : minimumWithdrawalSetting.value) || 10000;
        if (requestedAmount < minimumWithdrawalAmount) {
            return res.status(400).json({ error: `Minimum withdrawal amount is Rp${minimumWithdrawalAmount.toLocaleString('id-ID')}` });
        }
        const commissionsCollection = db.collection('commissions');
        const withdrawalsCollection = db.collection('withdrawals');
        // 1. Calculate withdrawable balance
        const availableCommissions = yield commissionsCollection.find({
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
        const result = yield withdrawalsCollection.insertOne(newWithdrawal);
        // Get affiliator info for notifications
        const affiliator = yield db.collection('users').findOne({ _id: new mongodb_1.ObjectId(affiliatorId) });
        // 4. Process reserved commissions
        let amountToCover = requestedAmount;
        const reservedCommissionIds = [];
        for (const commission of availableCommissions) {
            if (amountToCover <= 0)
                break;
            const usedAmount = commission.usedAmount || 0;
            const availableBalance = commission.amount - usedAmount;
            if (availableBalance <= 0)
                continue;
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
            const reservedResult = yield db.collection('commissions').insertOne(reservedCommission);
            // Update usedAmount
            const newUsedAmount = usedAmount + amountToUse;
            yield commissionsCollection.updateOne({ _id: commission._id }, { $set: { usedAmount: newUsedAmount } });
            reservedCommissionIds.push({
                commissionId: commission._id.toString(),
                amount: amountToUse,
                reservedCommissionId: reservedResult.insertedId.toString()
            });
            amountToCover -= amountToUse;
        }
        // Transaction log
        yield db.collection('withdrawal_transactions').insertOne({
            withdrawalId: result.insertedId.toString(),
            affiliatorId,
            totalAmount: requestedAmount,
            reservedCommissions: reservedCommissionIds,
            createdAt: new Date(),
        });
        // Notifications (using imported services)
        try {
            if (affiliator && affiliator.email) {
                yield notification_service_1.adminNotifications.withdrawalRequest(affiliator.name, requestedAmount.toLocaleString('id-ID'));
                yield notification_service_1.affiliatorNotifications.withdrawalApproved(requestedAmount.toLocaleString('id-ID'), new Date().toLocaleString('id-ID'), affiliator.email);
                const remainingBalance = withdrawableBalance - requestedAmount;
                yield notification_service_1.affiliatorNotifications.balanceUpdated(remainingBalance.toLocaleString('id-ID'), affiliator.email);
            }
        }
        catch (notificationError) {
            console.error('❌ Failed to send notifications for withdrawal:', notificationError);
        }
        const insertedWithdrawal = Object.assign(Object.assign({}, newWithdrawal), { id: result.insertedId.toString() });
        return res.status(201).json(insertedWithdrawal);
    }
    catch (error) {
        console.error('Error creating withdrawal request:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// GET /affiliator/customers
router.get('/customers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { affiliatorId } = req.query;
    if (!affiliatorId) {
        return res.status(400).json({ error: 'affiliatorId is required' });
    }
    try {
        const client = yield database_1.default;
        const db = client.db();
        const orders = yield db.collection('orders').find({ affiliatorId }).sort({ createdAt: -1 }).toArray();
        // Should ideally mock productMap logic or efficient lookup
        // Doing basic loop for now
        const allProducts = yield db.collection('products').find().toArray();
        const productMap = new Map();
        allProducts.forEach(product => {
            productMap.set(product._id.toString(), product);
        });
        const ordersWithProducts = orders.map(order => {
            var _a;
            const product = productMap.get(order.productId);
            let commission = 0;
            if (order.status !== 'cancelled' && product) {
                if (product.commissionType === 'percentage') {
                    commission = Math.round(Number(product.price) * (Number(product.commissionValue) / 100));
                }
                else if (product.commissionType === 'fixed') {
                    commission = Number(product.commissionValue) || 0;
                }
            }
            return Object.assign(Object.assign({}, order), { id: (_a = order._id) === null || _a === void 0 ? void 0 : _a.toString(), productName: (product === null || product === void 0 ? void 0 : product.name) || null, product: product || null, productPrice: (product === null || product === void 0 ? void 0 : product.price) || 0, commission: commission });
        });
        return res.json(ordersWithProducts);
    }
    catch (error) {
        console.error('Error fetching customers:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
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
router.get('/link-performance', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { affiliatorId, startDate, endDate, timezone = 'Asia/Jakarta' } = req.query;
    if (!affiliatorId)
        return res.status(400).json({ error: 'affiliatorId is required' });
    if (!startDate || !endDate)
        return res.status(400).json({ error: 'startDate and endDate are required' });
    try {
        const client = yield database_1.default;
        const db = client.db();
        const affiliateLinks = yield db.collection('affiliateLinks').find({ affiliatorId }).toArray();
        if (affiliateLinks.length === 0)
            return res.json([]);
        // Get product names
        const productIds = affiliateLinks.map(link => {
            // Handle productId type safely (string vs ObjectId)
            return mongodb_1.ObjectId.isValid(link.productId) ? new mongodb_1.ObjectId(link.productId) : link.productId;
        }).filter(id => id instanceof mongodb_1.ObjectId); // Filter only valid ObjectIds if schema mixed
        // If productIds are strings in links but ObjectIds in products collection:
        const products = yield db.collection('products').find({ _id: { $in: productIds } }).toArray();
        const productMap = new Map(products.map(p => [p._id.toString(), p.name]));
        const linkIds = affiliateLinks.map(link => link._id);
        const linkMap = new Map(affiliateLinks.map(link => [link._id.toString(), productMap.get(link.productId.toString()) || 'Unknown Product']));
        const clickData = yield db.collection('link_clicks').aggregate([
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
                            timezone: timezone
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
        const enrichedData = clickData.map(item => (Object.assign(Object.assign({}, item), { productName: linkMap.get(item.linkId.toString()) || 'Unknown Product' })));
        return res.json(enrichedData);
    }
    catch (error) {
        console.error('Error fetching link performance data:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
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
router.put('/links/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        if (!id || !mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const result = yield db.collection('affiliateLinks').updateOne({ _id: new mongodb_1.ObjectId(id) }, { $set: { isActive, updatedAt: new Date() } });
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }
        const updatedLink = yield db.collection('affiliateLinks').findOne({ _id: new mongodb_1.ObjectId(id) });
        const formattedLink = updatedLink ? Object.assign(Object.assign({}, updatedLink), { id: updatedLink._id.toString() }) : null;
        return res.json(formattedLink);
    }
    catch (error) {
        console.error('Error updating affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
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
router.delete('/links/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id || !mongodb_1.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const result = yield db.collection('affiliateLinks').deleteOne({ _id: new mongodb_1.ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Link not found' });
        }
        return res.json({ message: 'Link deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting affiliate link:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
