import express from 'express';
import { Notification } from '../models';
import { authenticateUser } from '../middleware/auth';
import { Op } from 'sequelize';

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
        const user = (req as any).user;

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const notifications = await Notification.findAll({
            where: {
                [Op.or]: [
                    { userId: user.userId },
                    { userEmail: user.email }
                ]
            },
            order: [['timestamp', 'DESC']],
            limit: 50
        });

        return res.json({
            success: true,
            notifications
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

        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (all) {
            await Notification.update(
                { read: true },
                {
                    where: {
                        [Op.or]: [
                            { userId: user.id },
                            { userEmail: user.email }
                        ],
                        read: false
                    }
                }
            );
        } else if (id) {
            const notification = await Notification.findOne({
                where: {
                    [Op.and]: [
                        { [Op.or]: [{ id: id }, { _id: id }] },
                        { [Op.or]: [
                            { userId: user.userId },
                            { userEmail: user.email }
                        ]}
                    ]
                }
            });

            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }

            await notification.update({ read: true });
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
