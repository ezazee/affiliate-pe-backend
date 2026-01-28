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
const uuid_1 = require("uuid");
const notification_service_1 = require("../services/notification-service");
const router = express_1.default.Router();
// Helper to generate unique order number
const generateOrderNumber = (db) => __awaiter(void 0, void 0, void 0, function* () {
    const prefix = 'ORDER';
    let isUnique = false;
    let orderNumber = '';
    while (!isUnique) {
        const randomPart = Math.random().toString(36).substring(2, 9).toUpperCase();
        orderNumber = `${prefix}-${randomPart}`;
        const existingOrder = yield db.collection('orders').findOne({ orderNumber });
        if (!existingOrder) {
            isUnique = true;
        }
    }
    return orderNumber;
});
/**
 * @swagger
 * tags:
 *   name: Public
 *   description: Public endpoints
 */
/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order (Public)
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
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { buyerName, buyerPhone, shippingAddress, city, province, postalCode, orderNote, productId, affiliatorId, affiliateCode, affiliateName, shippingCost, totalPrice, } = req.body;
        if (!buyerName || !buyerPhone || !shippingAddress || !city || !province || !postalCode ||
            !productId || !affiliatorId || !affiliateCode || !affiliateName ||
            shippingCost === undefined || totalPrice === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const orderNumber = yield generateOrderNumber(db);
        const paymentToken = (0, uuid_1.v4)();
        const paymentTokenExpiresAt = new Date(Date.now() + 1 * 60 * 1000);
        const product = yield db.collection('products').findOne({ _id: new mongodb_1.ObjectId(productId) });
        const productPrice = (product === null || product === void 0 ? void 0 : product.price) || 0;
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
            status: 'pending',
            shippingCost,
            productPrice,
            totalPrice,
            orderNote,
            createdAt: new Date(),
        };
        yield db.collection('orders').insertOne(orderToInsert);
        // Notifications
        const affiliator = yield db.collection('users').findOne({ _id: new mongodb_1.ObjectId(affiliatorId) });
        try {
            yield notification_service_1.adminNotifications.newOrder(orderNumber, buyerName, totalPrice.toLocaleString('id-ID'));
            if (affiliator && affiliator.email) {
                const commissionRate = 0.1;
                const commissionAmount = Math.round(productPrice * commissionRate);
                yield notification_service_1.affiliatorNotifications.newOrder(orderNumber, commissionAmount.toLocaleString('id-ID'), affiliator.email);
            }
        }
        catch (e) {
            console.error('Notification error', e);
        }
        return res.status(201).json({
            paymentToken: orderToInsert.paymentToken,
            orderNumber: orderToInsert.orderNumber,
            status: orderToInsert.status
        });
    }
    catch (error) {
        console.error('Order creation error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
// GET /orders/:orderNumber
router.get('/:orderNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderNumber } = req.params;
        const client = yield database_1.default;
        const db = client.db();
        const order = yield db.collection('orders').findOne({ orderNumber });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        return res.json(order);
    }
    catch (error) {
        console.error('Error fetching order:', error);
        return res.status(500).json({ error: 'Failed to fetch order' });
    }
}));
// PATCH /orders/:orderNumber
router.patch('/:orderNumber', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderNumber } = req.params;
        const { status } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const result = yield db.collection('orders').updateOne({ orderNumber }, {
            $set: {
                status,
                updatedAt: new Date()
            }
        });
        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        return res.json({ message: `Order ${orderNumber} status updated to ${status}` });
    }
    catch (error) {
        console.error('Error updating order:', error);
        return res.status(500).json({ error: 'Failed to update order status' });
    }
}));
exports.default = router;
