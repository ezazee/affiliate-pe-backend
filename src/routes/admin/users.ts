import express from 'express';
import { User } from '../../models';
import { authenticateUser, requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all registered users
 *     tags: [Admin]
 */
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
