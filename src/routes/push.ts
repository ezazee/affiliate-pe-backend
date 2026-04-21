import express from 'express';
import { User } from '../models';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

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
 *     security:
 *       - bearerAuth: []
 */
router.post('/subscribe', authenticateUser, async (req, res) => {
    try {
        const subscription = req.body;
        const user = (req as any).user;

        console.log(`[PUSH] Subscribe request for user: ${user?.email}`);

        if (!subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription data' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        await User.update(
            {
                pushSubscription: subscription,
                notificationsEnabled: true
            },
            { where: { id: user.id } }
        );

        console.log(`[PUSH] Subscription updated for ${user.email}`);

        return res.json({ success: true, message: 'Subscribed' });
    } catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Internal error' });
    }
});

/**
 * @swagger
 * /push/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     tags: [Push]
 *     security:
 *       - bearerAuth: []
 */
router.post('/unsubscribe', authenticateUser, async (req, res) => {
    try {
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        await User.update(
            {
                pushSubscription: null,
                notificationsEnabled: false
            },
            { where: { id: user.id } }
        );

        return res.json({ success: true, message: 'Unsubscribed' });
    } catch (error) {
        console.error('Unsubscription error:', error);
        return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

const { sendNotification } = require('../services/notification-service');

/**
 * @swagger
 * /push/send:
 *   post:
 *     summary: Send a test push notification
 *     tags: [Push]
 *     security:
 *       - bearerAuth: []
 */
router.post('/send', authenticateUser, async (req, res) => {
    try {
        const { title, body, url } = req.body;
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const result = await sendNotification(
            {
                title: title || 'Test Notification',
                body: body || 'Test body',
                url: url || '/'
            },
            { userEmail: user.email }
        );

        return res.json({
            success: result.success,
            sent: result.sent,
            message: result.message
        });

    } catch (error: any) {
        console.error('Test notification error:', error);
        return res.status(500).json({ error: 'Failed to send test notification', details: error.message });
    }
});

export default router;
