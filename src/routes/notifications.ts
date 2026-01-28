import express from 'express';
import clientPromise from '../config/database';
import { authenticateUser } from '../middleware/auth';
import { ObjectId } from 'mongodb';

const router = express.Router();

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
router.get('/', authenticateUser, async (req, res) => {
    try {
        // req.user is populated by authenticateUser middleware
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const client = await clientPromise;
        const db = client.db();

        const notifications = await db.collection('notifications')
            .find({ userEmail: user.email })
            .sort({ timestamp: -1 })
            .limit(50)
            .toArray();

        return res.json({
            success: true,
            notifications: notifications.map(n => ({
                ...n,
                id: n._id.toString(),
                _id: undefined
            }))
        });

    } catch (error) {
        console.error('Error fetching notifications:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

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
router.put('/read', authenticateUser, async (req, res) => {
    try {
        const { id, all } = req.body;
        const user = (req as any).user;
        const userEmail = user?.email;

        if (!userEmail) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const client = await clientPromise;
        const db = client.db();
        const notifications = db.collection('notifications');

        if (all) {
            await notifications.updateMany(
                { userEmail: userEmail, read: false },
                { $set: { read: true } }
            );
        } else if (id) {
            let query: any = { _id: new ObjectId(id), userEmail: userEmail };
            try {
                const result = await notifications.updateOne(
                    query,
                    { $set: { read: true } }
                );
                if (result.matchedCount === 0) {
                    return res.status(404).json({ error: 'Notification not found' });
                }
            } catch (e) {
                return res.status(400).json({ error: 'Invalid ID format' });
            }
        } else {
            return res.status(400).json({ error: 'Missing ID or all flag' });
        }

        return res.json({ success: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

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
router.post('/trigger', async (req, res) => {
    try {
        const { templateId, variables, targetUserId, targetRole } = req.body;

        if (!templateId) {
            return res.status(400).json({ error: 'Template ID is required' });
        }

        // Import service logic or mock it if complex. 
        const { sendTemplateNotification } = require('../services/notification-service');

        let targetOverride: any = {};
        if (targetUserId) targetOverride.userEmail = targetUserId;
        if (targetRole) targetOverride.role = targetRole;
        if (Object.keys(targetOverride).length === 0) targetOverride = undefined;

        const result = await sendTemplateNotification(
            templateId,
            variables || {},
            targetOverride
        );

        return res.json({ success: true, result });
    } catch (error: any) {
        console.error('Trigger notification error:', error);
        return res.status(500).json({ error: 'Failed to trigger notification', details: error.message });
    }
});

export default router;
