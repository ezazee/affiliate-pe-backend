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
const router = express_1.default.Router();
/**
 * @swagger
 * /web/notifications:
 *   post:
 *     summary: Store/Log web notification (Frontend legacy endpoint)
 *     tags: [Web]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification stored/logged
 */
router.post('/notifications', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, message, type, url, actionUrl, targetUserEmail } = req.body;
        if (!title || !message || !type) {
            return res.status(400).json({ error: 'Title, message, and type are required' });
        }
        // Store notification in memory for demo purposes (matching original behavior)
        console.log('🔔 Web notification stored:', {
            title,
            message,
            type,
            url,
            actionUrl,
            targetUserEmail,
            timestamp: new Date().toISOString()
        });
        return res.json({
            success: true,
            message: 'Web notification stored successfully'
        });
    }
    catch (error) {
        console.error('Web notification error:', error);
        return res.status(500).json({
            error: 'Failed to store web notification',
            details: error.message
        });
    }
}));
/**
 * @swagger
 * /web/notifications:
 *   get:
 *     summary: Web Notification API info
 *     tags: [Web]
 *     responses:
 *       200:
 *         description: API Info
 */
router.get('/notifications', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.json({
        message: 'Web Notification API',
        usage: {
            endpoint: '/api/web/notifications',
            method: 'POST',
            body: {
                title: 'Notification Title',
                message: 'Notification message',
                type: "info",
                url: '/optional-url',
                actionUrl: '/optional-action-url',
                targetUserEmail: 'user@example.com'
            }
        }
    });
}));
exports.default = router;
