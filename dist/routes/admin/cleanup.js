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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../../config/database"));
const router = express_1.default.Router();
// POST /admin/cleanup
/**
 * @swagger
 * /admin/cleanup:
 *   post:
 *     summary: Cleanup database (Dev/Test only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Cleanup results
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const linksResult = yield db.collection('affiliateLinks').deleteMany({});
        const commissionsResult = yield db.collection('commissions').deleteMany({});
        const ordersResult = yield db.collection('orders').deleteMany({});
        const withdrawalsResult = yield db.collection('withdrawals').deleteMany({});
        const testUserEmails = ['alice@example.com', 'bob@example.com', 'newuser@test.com'];
        const usersResult = yield db.collection('users').deleteMany({
            email: { $in: testUserEmails }
        });
        yield db.collection('settings').deleteMany({});
        yield db.collection('settings').insertMany([
            { name: 'minimumWithdrawal', value: 50000, createdAt: new Date() }
        ]);
        const results = {
            affiliateLinks: linksResult.deletedCount,
            commissions: commissionsResult.deletedCount,
            orders: ordersResult.deletedCount,
            withdrawals: withdrawalsResult.deletedCount,
            users: usersResult.deletedCount,
            settingsReset: true
        };
        return res.json({
            success: true,
            message: 'Cleanup complete',
            results
        });
    }
    catch (error) {
        console.error('Cleanup error:', error);
        return res.status(500).json({ error: 'Failed to cleanup database', details: error.message });
    }
}));
exports.default = router;
