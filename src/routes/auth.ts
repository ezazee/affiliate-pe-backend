import express from 'express';
import { User } from '../models';
import { adminNotifications } from '../services/notification-service';
import { v4 as uuidv4 } from 'uuid';
import { Security } from '../lib/security';
import { EmailService } from '../services/email-service';
import { authenticateUser } from '../middleware/auth';
import { Op } from 'sequelize';

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

// Helper to generate slug from name
const generateSlug = (text: string): string => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')     // Replace spaces with -
        .replace(/[^\w-]+/g, '')  // Remove all non-word chars
        .replace(/--+/g, '-');    // Replace multiple - with single -
};

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoint Autentikasi
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *                     referralCode:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by EMAIL only
        const user = await User.findOne({ where: { email } });

        if (user) {
            let isValidPassword = false;
            let needsMigration = false;

            // 1. Try comparing as Hash (New Standard)
            if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
                isValidPassword = await Security.comparePassword(password, user.password);
            } else {
                // 2. Fallback: Compare as Plain Text (Legacy)
                if (user.password === password) {
                    isValidPassword = true;
                    needsMigration = true; // Mark for migration to hash
                }
            }

            if (isValidPassword) {
                // Auto-migrate legacy password to hash
                if (needsMigration) {
                    const hashedPassword = await Security.hashPassword(password);
                    await user.update({ password: hashedPassword });
                    console.log(`[AUTH] Migrated password for user ${email} to hash.`);
                }

                if (!user.referralCode || !user.storeSlug) {
                    const referralCode = user.referralCode || generateReferralCode();
                    const registrationNumber = user.registrationNumber || `REG-${referralCode}`;
                    const storeSlug = user.storeSlug || `${generateSlug(user.name)}-${referralCode.substring(0, 4).toLowerCase()}`;
                    await user.update({ referralCode, registrationNumber, storeSlug });
                }

                const token = Security.generateToken({
                    email: user.email,
                    userId: user.id
                });

                const userJson = user.toJSON();
                delete userJson.password;
                return res.json({ 
                    user: userJson,
                    token: token
                });
            }
        }

        return res.status(401).json({ error: 'Invalid credentials' });

    } catch (error) {
        console.error('Login API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new affiliator
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - phone
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: User already exists or missing fields
 */
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const referralCode = generateReferralCode();
        const registrationNumber = `REG-${referralCode}`;
        const storeSlug = `${generateSlug(name)}-${referralCode.substring(0, 4).toLowerCase()}`;

        // Hash Password
        const hashedPassword = await Security.hashPassword(password);

        const createdUser = await User.create({
            name,
            email,
            password: hashedPassword,
            phone,
            role: 'affiliator',
            status: 'pending',
            referralCode,
            registrationNumber,
            storeSlug,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const userJson = createdUser.toJSON();
        delete userJson.password;

        // Send notifications about new affiliator registration
        try {
            await adminNotifications.newAffiliator(name, email);
        } catch (notificationError) {
            console.error('❌ Failed to send notifications to admins:', notificationError);
        }

        const token = Security.generateToken({
            email: createdUser.email,
            userId: createdUser.id
        });

        return res.json({ 
            user: userJson,
            token: token
        });
    } catch (error) {
        console.error('Register API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/logout', async (req, res) => {
    return res.json({ success: true, message: 'Logout successful' });
});

router.post('/verify', authenticateUser, async (req, res) => {
    try {
        // req.user is populated by authenticateUser if token is valid
        if (!req.user) {
            return res.json({ valid: false, error: 'Invalid or missing token' });
        }

        const user = await User.findByPk(req.user.userId);
        if (!user) {
            return res.json({ valid: false, error: 'User not found' });
        }

        return res.json({ 
            valid: true, 
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status
            } 
        });
    } catch (error) {
        console.error('Verify session API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(404).json({ error: 'Email tidak terdaftar' });
        }

        const resetToken = Security.generateResetToken();
        const hashedToken = Security.hashToken(resetToken);
        const resetExpires = new Date(Date.now() + 1800000); // 30 minutes

        await user.update({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: resetExpires
        });

        const frontendUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        const emailSent = await EmailService.sendPasswordResetEmail(email, resetUrl);

        if (emailSent) {
            return res.json({ message: 'If that email exists, we have sent a reset link to it.' });
        } else {
            return res.status(500).json({ error: 'Error sending email' });
        }

    } catch (error) {
        console.error('Forgot Password API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        const hashedToken = Security.hashToken(token);

        const user = await User.findOne({
            where: {
                resetPasswordToken: hashedToken,
                resetPasswordExpires: { [Op.gt]: new Date() }
            }
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        const hashedPassword = await Security.hashPassword(newPassword);

        await user.update({
            password: hashedPassword,
            resetPasswordToken: null,
            resetPasswordExpires: null
        });

        return res.json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Reset Password API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
