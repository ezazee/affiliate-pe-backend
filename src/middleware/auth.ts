import { Request, Response, NextFunction } from 'express';
import clientPromise from '../config/database';
import { Security } from '../lib/security';

// Extend Express Request type to include user
declare global {
    namespace Express {
        interface Request {
            user?: { email: string; userId: string };
        }
    }
}

export async function authenticateUser(req: Request, res: Response, next: NextFunction) {
    try {
        // Get session from Authorization header or cookie
        const authHeader = req.headers.authorization;
        // In Express, cookies are in req.headers.cookie string or req.cookies if cookie-parser is used.
        // For now we'll manually parse if needed or just check header for simplicity as main auth.
        // Ideally we should use cookie-parser if we want to support cookies fully.

        let sessionData = null;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
        } else if (authHeader?.startsWith('Basic ')) {
            // Handle Basic Auth (Email:Password) for Swagger
            const credentials = Buffer.from(authHeader.substring(6), 'base64').toString().split(':');
            const email = credentials[0];
            const password = credentials[1];

            if (email && password) {
                const client = await clientPromise;
                const db = client.db();
                const user = await db.collection('users').findOne({ email });

                if (user) {
                    let isValid = false;
                    // Check password (Hash or Plain)
                    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
                        isValid = await Security.comparePassword(password, user.password);
                    } else if (user.password === password) {
                        isValid = true;
                    }

                    if (isValid) {
                        req.user = { email: user.email, userId: user._id.toString() };
                        return next();
                    }
                }
            }
        } else if (req.headers.cookie && req.headers.cookie.includes('affiliate_user_session')) {
            // Simple cookie parsing
            const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = value;
                return acc;
            }, {} as Record<string, string>);
            const sessionCookie = cookies['affiliate_user_session'];
            if (sessionCookie) {
                try {
                    sessionData = JSON.parse(decodeURIComponent(sessionCookie));
                } catch (e) {
                    console.error('Failed to parse cookie', e);
                }
            }
        } else {
            const userEmail = req.headers['x-user-email'] as string;
            if (userEmail && userEmail.trim()) {
                req.user = { email: userEmail.trim(), userId: userEmail.trim() };
                return next();
            }
        }

        if (sessionData?.user?.email) {
            req.user = {
                email: sessionData.user.email,
                userId: sessionData.user._id || sessionData.user.id
            };
            return next();
        }

        // Proceed without user if auth failed (routes can check req.user)
        next();
    } catch (error) {
        console.error('Error in auth middleware:', error);
        next();
    }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
