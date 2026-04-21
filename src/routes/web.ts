import express from 'express';
import { Notification } from '../models';

const router = express.Router();

/**
 * @swagger
 * /web/notifications:
 *   post:
 *     summary: Store a web notification via webhook
 *     tags: [Web]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *               - type
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               type:
 *                 type: string
 *               url:
 *                 type: string
 *               targetUserEmail:
 *                 type: string
 */
router.post('/notifications', async (req, res) => {
    try {
        const { title, message, type, url, targetUserEmail } = req.body;

        if (!title || !message || !type) {
            return res.status(400).json({ error: 'Title, message, and type are required' });
        }

        const notification = await Notification.create({
            title,
            message,
            type: type || 'info',
            url: url || '#',
            userEmail: targetUserEmail || 'admin@peskinpro.com', // Default to admin if no target
            timestamp: new Date(),
            read: false,
            createdAt: new Date()
        } as any);

        return res.json({
            success: true,
            message: 'Web notification stored successfully',
            id: notification.id
        });

    } catch (error: any) {
        console.error('Web notification error:', error);
        return res.status(500).json({
            error: 'Failed to store web notification',
            details: error.message
        });
    }
});

/**
 * @swagger
 * /web/notifications:
 *   get:
 *     summary: Web Notification API info
 *     tags: [Web]
 */
router.get('/notifications', async (req, res) => {
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
                targetUserEmail: 'user@example.com'
            }
        }
    });
});

export default router;
