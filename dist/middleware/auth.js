"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
exports.requireAuth = requireAuth;
function authenticateUser(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            // Get session from Authorization header or cookie
            const authHeader = req.headers.authorization;
            // In Express, cookies are in req.headers.cookie string or req.cookies if cookie-parser is used.
            // For now we'll manually parse if needed or just check header for simplicity as main auth.
            // Ideally we should use cookie-parser if we want to support cookies fully.
            let sessionData = null;
            if (authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                sessionData = JSON.parse(Buffer.from(token, 'base64').toString());
            }
            else if (req.headers.cookie && req.headers.cookie.includes('affiliate_user_session')) {
                // Simple cookie parsing
                const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});
                const sessionCookie = cookies['affiliate_user_session'];
                if (sessionCookie) {
                    try {
                        sessionData = JSON.parse(decodeURIComponent(sessionCookie));
                    }
                    catch (e) {
                        console.error('Failed to parse cookie', e);
                    }
                }
            }
            else {
                const userEmail = req.headers['x-user-email'];
                if (userEmail && userEmail.trim()) {
                    req.user = { email: userEmail.trim(), userId: userEmail.trim() };
                    return next();
                }
            }
            if ((_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.user) === null || _a === void 0 ? void 0 : _a.email) {
                req.user = {
                    email: sessionData.user.email,
                    userId: sessionData.user._id || sessionData.user.id
                };
                return next();
            }
            // If we want to enforce auth, we'd return 401. But the original utils returned null.
            // We'll set req.user to undefined and let the route decide (or we can make an requireAuth middleware).
            // For now, let's just proceed.
            next();
        }
        catch (error) {
            console.error('Error in auth middleware:', error);
            next();
        }
    });
}
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
