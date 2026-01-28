import express from 'express';
import clientPromise from '../config/database';
import { ObjectId } from 'mongodb';

const router = express.Router();

// Function to generate a unique referral code
const generateReferralCode = (length: number = 8): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     summary: Get user by ID (Auto-generates referral code if missing)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
// GET /api/user/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const client = await clientPromise;
        const db = client.db();

        let user: any = await db.collection('users').findOne({ id: id });

        // Fallback or if `id` was meant to be `_id`
        if (!user) {
            try {
                user = await db.collection('users').findOne({ _id: new ObjectId(id) });
            } catch (e) {
                // ignore invalid object id format
            }
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (!user.referralCode || user.referralCode === '') {
            const referralCode = generateReferralCode();
            const registrationNumber = `REG-${referralCode}`;

            await db.collection('users').updateOne(
                { _id: user._id },
                { $set: { referralCode: referralCode, registrationNumber: registrationNumber } }
            );

            // Update local object
            user.referralCode = referralCode;
            user.registrationNumber = registrationNumber;
        }

        const { password, ...userWithoutPassword } = user;
        return res.json({ user: userWithoutPassword });

    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
