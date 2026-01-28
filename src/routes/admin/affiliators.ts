import express from 'express';
import clientPromise from '../../config/database';
import { User } from '../../types';
import { ObjectId } from 'mongodb';

const router = express.Router();

/**
 * @swagger
 * /admin/affiliators:
 *   get:
 *     summary: Ambil semua afiliator
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of affiliators
 */
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const affiliators = await db.collection<User>('users').find({ role: 'affiliator' }).toArray();

        const formattedAffiliators = affiliators.map(affiliator => {
            const { id, ...rest } = affiliator;
            return {
                ...rest,
                id: affiliator._id.toString(),
            };
        });

        return res.json(formattedAffiliators);
    } catch (error) {
        console.error('Error fetching affiliators:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/affiliators/{id}:
 *   delete:
 *     summary: Hapus afiliator (Admin)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Affiliator deleted
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection('users').deleteOne({ _id: new ObjectId(id), role: 'affiliator' });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        return res.json({ message: 'Affiliator deleted successfully' });

    } catch (error) {
        console.error('Error deleting affiliator:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// Update affiliator status (approve/reject) often exists but maybe in separate file. 
// Adding generic PUT for user details if needed, but usually approval is specific.
// I will check if there is an approval route elsewhere. 
// There is /users/:id/status usually, but let's add generic delete support here.

/**
 * @swagger
 * /admin/affiliators/{id}:
 *   put:
 *     summary: Update status afiliator (Admin)
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected, suspended]
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Status updated
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, name, email, phone } = req.body;
        const client = await clientPromise;
        const db = client.db();

        const updateData: any = {};
        if (status) updateData.status = status;
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const result = await db.collection('users').updateOne(
            { _id: new ObjectId(id), role: 'affiliator' },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Affiliator not found' });
        }

        const updatedUser = await db.collection<User>('users').findOne({ _id: new ObjectId(id) });

        const formattedUser = updatedUser ? {
            ...updatedUser,
            id: updatedUser._id.toString(),
            _id: undefined
        } : null;

        return res.json(formattedUser);

    } catch (error) {
        console.error('Error updating affiliator:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
