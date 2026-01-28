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
 * /admin/links:
 *   get:
 *     summary: Get all affiliate links
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: List of affiliate links with user info
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const affiliateLinks = yield db.collection('affiliateLinks')
            .aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'affiliatorId',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    'user.password': 0
                }
            }
        ])
            .toArray();
        // Map _id in result if needed or let frontend handle it. 
        // Aggregation results are raw documents.
        const formattedLinks = affiliateLinks.map(link => (Object.assign(Object.assign({}, link), { id: link._id.toString(), user: Object.assign(Object.assign({}, link.user), { id: link.user._id.toString() }) })));
        return res.json(formattedLinks);
    }
    catch (error) {
        console.error('Error fetching affiliate links:', error);
        return res.status(500).json({ error: 'Failed to fetch links' });
    }
}));
exports.default = router;
