import express from 'express';
import clientPromise from '../../config/database';

const router = express.Router();

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Key-value settings object
 */
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();
        const settingsCursor = db.collection('settings').find({});
        const settingsArray = await settingsCursor.toArray();

        const settings = settingsArray.reduce((acc, setting) => {
            acc[setting.name] = setting.value;
            return acc;
        }, {} as Record<string, any>);

        return res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

/**
 * @swagger
 * /admin/settings:
 *   post:
 *     summary: Update a setting
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - value
 *     responses:
 *       200:
 *         description: Setting updated
 */
router.post('/', async (req, res) => {
    try {
        const { name, value } = req.body;

        if (!name || value === undefined) {
            return res.status(400).json({ error: 'Invalid setting format. "name" and "value" are required.' });
        }

        const client = await clientPromise;
        const db = client.db();

        await db.collection('settings').updateOne(
            { name: name },
            { $set: { name, value } },
            { upsert: true }
        );

        return res.json({ message: `Setting '${name}' updated successfully` });
    } catch (error) {
        console.error('Error updating setting:', error);
        return res.status(500).json({ error: 'Failed to update setting' });
    }
});

export default router;
