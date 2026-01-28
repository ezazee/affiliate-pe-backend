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
const router = express_1.default.Router();
/**
 * @swagger
 * /payment-details/{paymentToken}:
 *   get:
 *     summary: Get order details by payment token
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: paymentToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 *       410:
 *         description: Payment link expired
 *       409:
 *         description: Payment link already used
 */
// GET /api/payment-details/:paymentToken
router.get('/:paymentToken', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { paymentToken } = req.params;
    if (!paymentToken) {
        return res.status(400).json({ error: 'Payment token is required' });
    }
    try {
        const client = yield database_1.default;
        const db = client.db();
        const orders = yield db.collection('orders').aggregate([
            { $match: { paymentToken } },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productId',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } }
        ]).toArray();
        const order = orders[0];
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        // Check if the payment link has expired
        if (order.paymentTokenExpiresAt && new Date() > new Date(order.paymentTokenExpiresAt)) {
            // Optionally, update the order status to 'cancelled' if expired
            yield db.collection('orders').updateOne({ _id: order._id }, { $set: { status: 'cancelled' } });
            return res.status(410).json({ error: 'Payment link has expired' }); // 410 Gone
        }
        // Check if the payment link has already been used
        if (order.isPaymentUsed) {
            return res.status(409).json({ error: 'Payment link already used' }); // 409 Conflict
        }
        const orderWithId = Object.assign(Object.assign({}, order), { id: (_a = order._id) === null || _a === void 0 ? void 0 : _a.toString() });
        return res.json(orderWithId);
    }
    catch (error) {
        console.error('Error fetching payment details:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
