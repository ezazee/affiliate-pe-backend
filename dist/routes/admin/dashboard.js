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
 * /admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats
 */
// GET /api/admin/dashboard
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        // Get all affiliators
        const affiliators = yield db.collection('users').aggregate([
            { $match: { role: 'affiliator' } },
            {
                $addFields: {
                    affiliatorIdString: { $toString: '$_id' }
                }
            },
            {
                $lookup: {
                    from: 'affiliateLinks',
                    localField: 'affiliatorIdString',
                    foreignField: 'affiliatorId',
                    as: 'links'
                }
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: 'affiliatorIdString',
                    foreignField: 'affiliatorId',
                    as: 'orders'
                }
            },
            {
                $lookup: {
                    from: 'commissions',
                    localField: 'affiliatorIdString',
                    foreignField: 'affiliatorId',
                    as: 'commissions'
                }
            },
            {
                $project: {
                    password: 0, // Exclude password
                    affiliatorIdString: 0 // Exclude temporary field
                }
            }
        ]).toArray();
        // Calculate stats per affiliator
        const affiliatorStats = affiliators.map(affiliator => {
            var _a;
            const links = affiliator.links || [];
            const orders = (affiliator.orders || []); // simple casting
            const commissions = (affiliator.commissions || []);
            const totalOrders = orders.length;
            const paidOrders = orders.filter(o => o.status === 'paid').length;
            const totalRevenue = orders.filter(o => o.status === 'paid').reduce((sum, o) => sum + (o.totalPrice || 0), 0);
            // Calculate commissions
            const totalCommission = commissions
                .filter(c => c.status === 'approved' || c.status === 'paid')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            const paidCommission = commissions
                .filter(c => c.status === 'paid')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            const withdrawableCommission = commissions
                .filter(c => c.status === 'approved')
                .reduce((sum, c) => sum + (c.amount || 0), 0);
            return Object.assign(Object.assign({}, affiliator), { id: (_a = affiliator._id) === null || _a === void 0 ? void 0 : _a.toString(), stats: {
                    totalLinks: links.length,
                    totalOrders,
                    paidOrders,
                    totalRevenue,
                    totalCommission,
                    paidCommission,
                    withdrawableCommission,
                    conversionRate: totalOrders > 0 ? ((paidOrders / totalOrders) * 100).toFixed(1) : '0'
                } });
        });
        // Overall stats
        const overallStats = {
            totalAffiliators: affiliatorStats.length,
            totalOrders: affiliatorStats.reduce((sum, a) => sum + a.stats.totalOrders, 0),
            paidOrders: affiliatorStats.reduce((sum, a) => sum + a.stats.paidOrders, 0),
            totalRevenue: affiliatorStats.reduce((sum, a) => sum + a.stats.totalRevenue, 0),
            totalCommission: affiliatorStats.reduce((sum, a) => sum + a.stats.totalCommission, 0),
            netRevenue: affiliatorStats.reduce((sum, a) => sum + (a.stats.totalRevenue - a.stats.totalCommission), 0), // Pendapatan bersih
            activeAffiliators: affiliatorStats.filter(a => a.stats.totalOrders > 0).length
        };
        res.json({
            overallStats,
            affiliators: affiliatorStats
        });
    }
    catch (error) {
        console.error('Error fetching admin dashboard data:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
