import express from 'express';
import { User } from '../models';
import { Op } from 'sequelize';
import { Security } from '../lib/security';

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
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        let user = await User.findOne({
            where: {
                [Op.or]: [{ id: id }, { _id: id }]
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Auto-generate referral code if missing
        if (!user.referralCode || user.referralCode === '') {
            const referralCode = generateReferralCode();
            const registrationNumber = `REG-${referralCode}`;

            await user.update({
                referralCode: referralCode,
                registrationNumber: registrationNumber
            });
        }

        const userData = user.toJSON() as any;
        delete userData.password;

        return res.json({ user: userData });

    } catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /user/{id}:
 *   put:
 *     summary: Update user profile (Name & Password)
 *     tags: [User]
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, password } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const user = await User.findOne({
            where: {
                [Op.or]: [{ id: id }, { _id: id }]
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updateData: any = {};
        if (name) updateData.name = name;
        
        if (password && password.trim() !== '') {
            updateData.password = await Security.hashPassword(password);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Tidak ada data untuk diperbarui' });
        }

        await user.update(updateData);

        const userData = user.toJSON() as any;
        delete userData.password;

        return res.json({ 
            success: true, 
            message: 'Profil berhasil diperbarui',
            user: userData 
        });

    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({ error: 'Gagal memperbarui profil' });
    }
});

export default router;
