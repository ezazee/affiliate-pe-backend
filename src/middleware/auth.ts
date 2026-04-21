import { Request, Response, NextFunction } from 'express';
import { User } from '../models';
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
        const authHeader = req.headers.authorization;
        let sessionData = null;

        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = Security.verifyToken(token);
            if (decoded) {
                req.user = { email: decoded.email, userId: decoded.userId };
                return next();
            }
        } else if (authHeader?.startsWith('Basic ')) {
            // Handle Basic Auth (Email:Password) for Swagger
            const credentials = Buffer.from(authHeader.substring(6), 'base64').toString().split(':');
            const email = credentials[0];
            const password = credentials[1];

            if (email && password) {
                const user = await User.findOne({ where: { email } });

                if (user) {
                    let isValid = false;
                    // Check password (Hash or Plain)
                    if (user.password && (user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))) {
                        isValid = await Security.comparePassword(password, user.password);
                    } else if (user.password === password) {
                        isValid = true;
                    }

                    if (isValid) {
                        req.user = { email: user.email, userId: user.id };
                        return next();
                    }
                }
            }
        } else if (req.headers.cookie && req.headers.cookie.includes('affiliate_user_session')) {
            const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
                const [key, value] = cookie.trim().split('=');
                acc[key] = value;
                return acc;
            }, {} as Record<string, string>);
            const sessionCookie = cookies['affiliate_user_session'];
            if (sessionCookie) {
                try {
                    const sessionObj = JSON.parse(decodeURIComponent(sessionCookie));
                    // If cookie also contains JWT, we should verify it
                    if (sessionObj.token) {
                        const decoded = Security.verifyToken(sessionObj.token);
                        if (decoded) {
                            req.user = { email: decoded.email, userId: decoded.userId };
                            return next();
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse cookie', e);
                }
            }
        }

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

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const user = await User.findByPk(req.user.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        next();
    } catch (error) {
        console.error('Error in requireAdmin middleware:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
