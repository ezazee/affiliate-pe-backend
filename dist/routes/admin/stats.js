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
/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get admin dashboard stats (summary)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Stats object
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const [paidOrders, allCommissions, products, approvedAffiliatorsCount, totalOrdersCount] = yield Promise.all([
            db.collection('orders').find({ status: 'paid' }).toArray(),
            db.collection('commissions').find({}).toArray(),
            db.collection('products').find({}).toArray(),
            db.collection('users').countDocuments({ role: 'affiliator', status: 'approved' }),
            db.collection('orders').countDocuments()
        ]);
        const productPriceMap = new Map(products.map(p => [p._id.toString(), p.price]));
        const totalGrossRevenue = paidOrders.reduce((sum, order) => {
            const price = productPriceMap.get(order.productId) || 0;
            return sum + (Number(price) || 0); // Ensure number
        }, 0);
        const totalCommissionsValue = allCommissions.reduce((sum, c) => sum + (c.amount || 0), 0);
        const totalNetRevenue = totalGrossRevenue - totalCommissionsValue;
        return res.json({
            totalRevenue: totalNetRevenue,
            totalAffiliators: approvedAffiliatorsCount,
            totalOrders: totalOrdersCount,
            totalCommissions: totalCommissionsValue,
        });
    }
    catch (error) {
        console.error('Error fetching admin stats:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
