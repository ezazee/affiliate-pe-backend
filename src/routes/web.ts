import express from 'express';

const router = express.Router();


router.post('/notifications', async (req, res) => {
    try {
        const { title, message, type, url, actionUrl, targetUserEmail } = req.body;

        if (!title || !message || !type) {
            return res.status(400).json({ error: 'Title, message, and type are required' });
        }



        return res.json({
            success: true,
            message: 'Web notification stored successfully'
        });

    } catch (error: any) {

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
 *     responses:
 *       200:
 *         description: API Info
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
                actionUrl: '/optional-action-url',
                targetUserEmail: 'user@example.com'
            }
        }
    });
});

export default router;
