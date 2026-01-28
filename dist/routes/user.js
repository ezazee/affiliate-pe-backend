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
router.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const client = yield database_1.default;
        const db = client.db();
        let user = yield db.collection('users').findOne({ id: id });
        // Fallback or if `id` was meant to be `_id`
        if (!user) {
            try {
                user = yield db.collection('users').findOne({ _id: new mongodb_1.ObjectId(id) });
            }
            catch (e) {
                // ignore invalid object id format
            }
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        if (!user.referralCode || user.referralCode === '') {
            const referralCode = generateReferralCode();
            const registrationNumber = `REG-${referralCode}`;
            yield db.collection('users').updateOne({ _id: user._id }, { $set: { referralCode: referralCode, registrationNumber: registrationNumber } });
            // Update local object
            user.referralCode = referralCode;
            user.registrationNumber = registrationNumber;
        }
        const { password } = user, userWithoutPassword = __rest(user, ["password"]);
        return res.json({ user: userWithoutPassword });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
