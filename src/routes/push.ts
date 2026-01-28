import express from 'express';
import clientPromise from '../config/database';
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
router.post('/subscribe', authenticateUser, async (req, res) => {
    try {
        const subscription = req.body;
        const user = (req as any).user; // Added by auth middleware

        console.log(`[PUSH] Subscribe request for user: ${user?.email}`);
        console.log(`[PUSH] Subscription payload:`, JSON.stringify(subscription).substring(0, 100) + '...');

        if (!subscription.endpoint || !subscription.keys) {
            console.warn('[PUSH] Invalid subscription data missing endpoint or keys');
            return res.status(400).json({ error: 'Invalid subscription data' });
        }

        if (!user) {
            console.warn('[PUSH] Authentication failed for subscription');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const client = await clientPromise;
        const db = client.db();

        const updateResult = await db.collection('users').updateOne(
            { email: user.email },
            {
                $set: {
                    pushSubscription: subscription,
                    notificationsEnabled: true,
                    updatedAt: new Date(),
                }
            }
        );

        console.log(`[PUSH] Subscription updated for ${user.email}. Modified count: ${updateResult.modifiedCount}`);

        return res.json({ success: true, message: 'Subscribed' });
    } catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Internal error' });
    }
});

router.post('/unsubscribe', authenticateUser, async (req, res) => {
    try {
        // const { endpoint } = req.body; // Unused in original logic
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const client = await clientPromise;
        const db = client.db();

        await db.collection('users').updateOne(
            { email: user.email },
            {
                $unset: { pushSubscription: '' },
                $set: {
                    notificationsEnabled: false,
                    updatedAt: new Date(),
                },
            }
        );

        return res.json({ success: true, message: 'Unsubscribed' });
    } catch (error) {
        console.error('Unsubscription error:', error);
        return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// Import the service
const { sendNotification } = require('../services/notification-service');

router.post('/send', authenticateUser, async (req, res) => {
    try {
        const { title, body, url } = req.body;
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Send checking only the current user
        // We can manually call the internal logic or use the service if it exposes a direct "send to user" method.
        // The service 'sendNotification' takes (data, target).

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
