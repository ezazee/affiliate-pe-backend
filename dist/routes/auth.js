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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const mongodb_1 = require("mongodb");
const notification_service_1 = require("../services/notification-service");
const router = express_1.default.Router();
// Function to generate a unique referral code
const generateReferralCode = (length = 8) => {
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
 *   description: Authentication endpoints
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
router.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const client = yield database_1.default;
        const db = client.db();
        const user = yield db.collection('users').findOne({ email, password });
        if (user) {
            if (!user.referralCode) {
                const referralCode = generateReferralCode();
                const registrationNumber = `REG-${referralCode}`;
                yield db.collection('users').updateOne({ _id: user._id }, { $set: { referralCode: referralCode, registrationNumber: registrationNumber } });
                user.referralCode = referralCode;
                user.registrationNumber = registrationNumber; // Update local user object
            }
            const { password: _ } = user, userWithoutPassword = __rest(user, ["password"]);
            return res.json({ user: userWithoutPassword });
        }
        else {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
    }
    catch (error) {
        console.error('Login API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
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
router.post('/register', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, email, password, phone } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const existingUser = yield db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        const referralCode = generateReferralCode();
        const registrationNumber = `REG-${referralCode}`;
        const userToInsert = {
            name,
            email,
            password,
            phone, // Added phone number
            role: 'affiliator',
            status: 'pending',
            referralCode,
            registrationNumber,
            createdAt: new Date(),
        };
        const result = yield db.collection('users').insertOne(userToInsert);
        const createdUser = Object.assign(Object.assign({}, userToInsert), { _id: result.insertedId, id: result.insertedId.toString() });
        // Send notifications about new affiliator registration
        try {
            // Push notification & In-app to admins
            yield notification_service_1.adminNotifications.newAffiliator(name, email);
        }
        catch (notificationError) {
            console.error('❌ Failed to send notifications to admins:', notificationError);
            // Continue with registration even if notification fails
        }
        return res.json({ user: createdUser });
    }
    catch (error) {
        console.error('Register API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
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
router.post('/logout', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // For stateless authentication (JWT/Session), logout is often client-side.
    // We provide this endpoint for logging or cookie clearing if we move to httpOnly cookies.
    return res.json({ success: true, message: 'Logout successful' });
}));
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
router.post('/verify', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        const client = yield database_1.default;
        const db = client.db();
        // Check ObjectId validity if using ObjectId
        if (!mongodb_1.ObjectId.isValid(userId)) {
            return res.json({ valid: false });
        }
        const user = yield db.collection('users').findOne({ _id: new mongodb_1.ObjectId(userId) });
        if (user) {
            return res.json({ valid: true });
        }
        else {
            return res.json({ valid: false });
        }
    }
    catch (error) {
        console.error('Verify session API error:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
