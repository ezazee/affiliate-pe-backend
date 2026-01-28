import express from 'express';
import clientPromise from '../config/database';
import { User } from '../types/user';
import { ObjectId } from 'mongodb';
import { adminNotifications } from '../services/notification-service';
import { v4 as uuidv4 } from 'uuid';
import { Security } from '../lib/security';
import { EmailService } from '../services/email-service';

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
        const client = await clientPromise;
        const db = client.db();

        // Find user by EMAIL only (since password might be hashed or plain)
        const user = await db.collection<User>('users').findOne({ email });

        if (user) {
            let isValidPassword = false;
            let needsMigration = false;

            // 1. Try comparing as Hash (New Standard)
            // If password field starts with $2a$ or $2b$, it's likely a bcrypt hash
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
                    await db.collection('users').updateOne(
                        { _id: user._id },
                        { $set: { password: hashedPassword } }
                    );
                    console.log(`[AUTH] Migrated password for user ${email} to hash.`);
                }

                if (!user.referralCode) {
                    const referralCode = generateReferralCode();
                    const registrationNumber = `REG-${referralCode}`;
                    await db.collection('users').updateOne(
                        { _id: user._id },
                        { $set: { referralCode: referralCode, registrationNumber: registrationNumber } }
                    );
                    user.referralCode = referralCode;
                    user.registrationNumber = registrationNumber;
                }

                const { password: _, ...userWithoutPassword } = user;
                return res.json({ user: userWithoutPassword });
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

        const client = await clientPromise;
        const db = client.db();

        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const referralCode = generateReferralCode();
        const registrationNumber = `REG-${referralCode}`;

        // Hash Password
        const hashedPassword = await Security.hashPassword(password);

        const userToInsert: any = { // Use any to bypass TS strict check on _id for now during insert
            name,
            email,
            password: hashedPassword, // Save Hashed Password
            phone, // Added phone number
            role: 'affiliator',
            status: 'pending',
            referralCode,
            registrationNumber,
            createdAt: new Date(),
        };

        const result = await db.collection('users').insertOne(userToInsert);
        const createdUser = { ...userToInsert, _id: result.insertedId, id: result.insertedId.toString() };

        // Send notifications about new affiliator registration
        try {
            // Push notification & In-app to admins
            await adminNotifications.newAffiliator(name, email);
        } catch (notificationError) {
            console.error('❌ Failed to send notifications to admins:', notificationError);
            // Continue with registration even if notification fails
        }

        return res.json({ user: createdUser });
    } catch (error) {
        console.error('Register API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// POST /auth/logout
/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', async (req, res) => {
    // For stateless authentication (JWT/Session), logout is often client-side.
    // We provide this endpoint for logging or cookie clearing if we move to httpOnly cookies.
    return res.json({ success: true, message: 'Logout successful' });
});

// POST /auth/verify
/**
 * @swagger
 * /auth/verify:
 *   post:
 *     summary: Verify user session
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Session valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 */
router.post('/verify', async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const client = await clientPromise;
        const db = client.db();

        // Check ObjectId validity if using ObjectId
        if (!ObjectId.isValid(userId)) {
            return res.json({ valid: false });
        }

        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

        if (user) {
            return res.json({ valid: true });
        } else {
            return res.json({ valid: false });
        }
    } catch (error) {
        console.error('Verify session API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});


/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent (if email exists)
 */
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const client = await clientPromise;
        const db = client.db();

        const user = await db.collection('users').findOne({ email });

        if (!user) {
            // As requested: Explicitly tell if email is not registered
            return res.status(404).json({ error: 'Email tidak terdaftar' });
        }

        // Generate reset token
        const resetToken = Security.generateResetToken();
        const hashedToken = Security.hashToken(resetToken);
        const resetExpires = Date.now() + 1800000; // 30 minutes

        // Save hashed token to DB
        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: {
                    resetPasswordToken: hashedToken,
                    resetPasswordExpires: resetExpires
                }
            }
        );

        // Construct Request URL (Frontend URL)
        // Typically this should be an env variable like FRONTEND_URL, but falling back to origin for now
        // Assuming Frontend runs on localhost:3000 for dev or configured PROD URL
        const frontendUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        // Send Email with UNHASHED token
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

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required' });
        }

        // Hash the incoming token to compare with storage
        const hashedToken = Security.hashToken(token);

        const client = await clientPromise;
        const db = client.db();

        const user = await db.collection('users').findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Password reset token is invalid or has expired.' });
        }

        // Hash new password
        // Normally we'd use Security.hashPassword(newPassword) here
        // BUT current login implementation uses PLAIN TEXT (checked in previous steps: findOne({ email, password }))
        // To maintain compatibility with existing login, we must use plain text OR upgrade login.
        // User requested "secure password reset" and implied upgrading security.
        // However, if I hash it here, the current Login flow `findOne({ email, password })` will FAIL for this user.
        // I MUST UPDATE LOGIN TO SUPPORT HASHED PASSWORDS TOO or fallback.
        // Decision: I will save as PLAIN TEXT for now to strictly follow "Don't break existing function" unless explicit.
        // WAIT, user explicitly asked: "di-hash sebelum disimpan" (token hashed), but for password: "mengirim token serta password baru ke backend".
        // Actually, standard practice is to hash password.
        // Let's look at the Login route again. It is `db.collection('users').findOne({ email, password });`
        // If I hash the password here, the user won't be able to login.
        // I'll stick to PLAIN TEXT for password to ensure login works, UNLESS I upgrade login too.
        // User prompt: "Buat sistem reset password yang aman... token acak, di-hash...".
        // It didn't explicitly demand hashing the PASSWORD itself, but "secure" implies it.
        // Given the constraint "JANGAN SAMPAI MENGUBAH FUNGSI NYA" from previous request, modifying Login might be risky.
        // However, I can't claim "secure" with plain text passwords.
        // I will use PLAIN TEXT for password Update to match existing Login, BUT I will leave a TODO or
        // implement a check in Login to support both if I were really ambitious.
        // For now, to satisfy the specific "Reset Password" request without breaking Login:
        // I will save the password directly.
        // RE-READING PROMPT: "secure password reset system... token reset (random, hashed...)" -> refers to TOKEN.
        // Logic: Token IS hashed. Password... "send new password to backend".
        // I will store the password AS IS to be compatible with `auth.ts:findOne({ email, password })`.

        // UPDATE: I can't leave it insecure. But I can't break login.
        // I will just save `newPassword` directly.

        // Hash new password
        const hashedPassword = await Security.hashPassword(newPassword);

        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetPasswordToken: "", resetPasswordExpires: "" }
            }
        );

        return res.json({ message: 'Password has been reset successfully.' });

    } catch (error) {
        console.error('Reset Password API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
