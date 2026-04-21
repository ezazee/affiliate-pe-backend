import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET || 'peskinpro-secret-key-2024';

export class Security {
    /**
     * Generate a JWT token for a user
     */
    static generateToken(payload: { email: string; userId: string }): string {
        return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    }

    /**
     * Verify a JWT token
     */
    static verifyToken(token: string): any {
        try {
            return jwt.verify(token, JWT_SECRET);
        } catch (error) {
            return null;
        }
    }

    /**
     * Hash a plain text password using bcrypt
     */
    static async hashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Compare a plain text password with a hash
     */
    static async comparePassword(plain: string, hash: string): Promise<boolean> {
        return bcrypt.compare(plain, hash);
    }

    /**
     * Generate a random reset token (hex string)
     */
    static generateResetToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Hash a token using SHA-256 for secure storage in DB
     */
    static hashToken(token: string): string {
        return crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');
    }
}
