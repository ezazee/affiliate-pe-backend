import express from 'express';
import clientPromise from '../config/database';

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
router.post('/subscribe', async (req, res) => {
    try {
        const subscription = req.body;
        const user = req.user; // Added by auth middleware

        if (!subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Invalid subscription data' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const client = await clientPromise;
        const db = client.db();

        await db.collection('users').updateOne(
            { email: user.email },
            {
                $set: {
                    pushSubscription: subscription,
                    notificationsEnabled: true,
                    updatedAt: new Date(),
                }
            }
        );

        return res.json({ success: true, message: 'Subscribed' });
    } catch (error) {
        console.error('Subscription error:', error);
        return res.status(500).json({ error: 'Internal error' });
    }
});

router.delete('/unsubscribe', async (req, res) => {
    try {
        // const { endpoint } = req.body; // Unused in original logic actually, it just unsets for the user
        const user = req.user;

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

export default router;
