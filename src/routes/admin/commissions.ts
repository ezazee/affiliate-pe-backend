import express from 'express';
import clientPromise from '../../config/database';
import { ObjectId } from 'mongodb';
import { authenticateUser, requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /admin/commissions:
 *   get:
 *     summary: List all commissions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of commissions
 *   put:
 *     summary: Update commission status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commissionId
 *               - status
 *             properties:
 *               commissionId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Commission updated
 *       404:
 *         description: Commission not found
 */
// GET /api/admin/commissions
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const commissions = await db.collection('commissions').find({}).sort({ createdAt: -1 }).toArray();

        // Map _id to id
        const formattedCommissions = commissions.map(commission => {
            return {
                ...commission,
                id: commission._id.toString(),
            };
        });

        res.json(formattedCommissions);
    } catch (error) {
        console.error('Error fetching admin commissions:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// PUT /api/admin/commissions - Update commission status
// In Next.js this was PUT /api/admin/commissions with body { commissionId, status }
router.put('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { commissionId, status } = req.body;

        if (!commissionId || !status) {
            return res.status(400).json({ error: 'commissionId and status are required' });
        }

        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection('commissions').findOneAndUpdate(
            { _id: new ObjectId(commissionId) },
            { $set: { status: status, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );

        if (!result) {
            return res.status(404).json({ error: 'Commission not found' });
        }

        const updatedCommission = {
            ...result,
            id: result._id.toString()
        };

        res.json(updatedCommission);
    } catch (error) {
        console.error('Error updating commission:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
