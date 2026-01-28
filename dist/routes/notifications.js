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
const auth_1 = require("../middleware/auth");
const mongodb_1 = require("mongodb");
const router = express_1.default.Router();
/**
 * @swagger
 * /notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 */
// GET /api/notifications
router.get('/', auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // req.user is populated by authenticateUser middleware
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const notifications = yield db.collection('notifications')
            .find({ userEmail: user.email })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();
        return res.json({
            success: true,
            notifications: notifications.map(n => (Object.assign(Object.assign({}, n), { id: n._id.toString(), _id: undefined })))
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}));
// PUT /api/notifications/read
/**
 * @swagger
 * /notifications/read:
 *   put:
 *     summary: Mark notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *                 description: Notification ID to mark as read
 *               all:
 *                 type: boolean
 *                 description: Mark all as read
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.put('/read', auth_1.authenticateUser, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, all } = req.body;
        const user = req.user;
        const userEmail = user === null || user === void 0 ? void 0 : user.email;
        if (!userEmail) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const notifications = db.collection('notifications');
        if (all) {
            yield notifications.updateMany({ userEmail: userEmail, read: false }, { $set: { read: true } });
        }
        else if (id) {
            let query = { _id: new mongodb_1.ObjectId(id), userEmail: userEmail };
            try {
                const result = yield notifications.updateOne(query, { $set: { read: true } });
                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: 'Notification not found' });
                }
            }
            catch (e) {
                return res.status(400).json({ error: 'Invalid ID format' });
            }
        }
        else {
            return res.status(400).json({ error: 'Missing ID or all flag' });
        }
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Error marking notification read:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}));
// POST /api/notifications/trigger
/**
 * @swagger
 * /notifications/trigger:
 *   post:
 *     summary: Trigger a notification (Admin/System)
 *     tags: [Notifications]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - templateId
 *             properties:
 *               templateId:
 *                 type: string
 *               variables:
 *                 type: object
 *               targetUserId:
 *                 type: string
 *               targetRole:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification triggered
 */
router.post('/trigger', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { templateId, variables, targetUserId, targetRole } = req.body;
        if (!templateId) {
            return res.status(400).json({ error: 'Template ID is required' });
        }
        // Import service logic or mock it if complex. 
        const { sendTemplateNotification } = require('../services/notification-service');
        let targetOverride = {};
        if (targetUserId)
            targetOverride.userEmail = targetUserId;
        if (targetRole)
            targetOverride.role = targetRole;
        if (Object.keys(targetOverride).length === 0)
            targetOverride = undefined;
        const result = yield sendTemplateNotification(templateId, variables || {}, targetOverride);
        return res.json({ success: true, result });
    }
    catch (error) {
        console.error('Trigger notification error:', error);
        return res.status(500).json({ error: 'Failed to trigger notification', details: error.message });
    }
}));
exports.default = router;
