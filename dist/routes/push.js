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
 * tags:
 *   name: Push
 *   description: Push notification endpoints
 */
/**
 * @swagger
 * /push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Push]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription
 *             properties:
 *               subscription:
 *                 type: object
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscribed successfully
 */
router.post('/subscribe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const subscription = req.body;
        const user = req.user; // Added by auth middleware
        if (!subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription data' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const client = yield database_1.default;
        const db = client.db();
        yield db.collection('users').updateOne({ email: user.email }, {
            $set: {
                pushSubscription: subscription,
                notificationsEnabled: true,
                updatedAt: new Date(),
            }
        });
        return res.json({ success: true, message: 'Subscribed' });
    }
    catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Internal error' });
    }
}));
router.delete('/unsubscribe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // const { endpoint } = req.body; // Unused in original logic actually, it just unsets for the user
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const client = yield database_1.default;
        const db = client.db();
        yield db.collection('users').updateOne({ email: user.email }, {
            $unset: { pushSubscription: '' },
            $set: {
                notificationsEnabled: false,
                updatedAt: new Date(),
            },
        });
        return res.json({ success: true, message: 'Unsubscribed' });
    }
    catch (error) {
        console.error('Unsubscription error:', error);
        return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
}));
exports.default = router;
