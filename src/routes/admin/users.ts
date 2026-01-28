import express from 'express';
import clientPromise from '../../config/database';
import { authenticateUser, requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all registered users
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
// GET /api/admin/users
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const users = await db.collection('users').find({}).toArray();

        // Map _id to id if needed, but Next.js route returned raw users from .find().toArray()
        // which includes _id.
        // We will return as is to match exactly.

        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
