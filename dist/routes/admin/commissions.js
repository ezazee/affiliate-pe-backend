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
const mongodb_1 = require("mongodb");
const auth_1 = require("../../middleware/auth");
const router = express_1.default.Router();
/**
 * @swagger
 * /admin/commissions:
 *   get:
 *     summary: List all commissions
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of commissions
 *   put:
 *     summary: Update commission status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - commissionId
 *               - status
 *             properties:
 *               commissionId:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Commission updated
 *       404:
 *         description: Commission not found
 */
// GET /api/admin/commissions
router.get('/', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const commissions = yield db.collection('commissions').find({}).sort({ createdAt: -1 }).toArray();
        // Map _id to id
        const formattedCommissions = commissions.map(commission => {
            return Object.assign(Object.assign({}, commission), { id: commission._id.toString() });
        });
        res.json(formattedCommissions);
    }
    catch (error) {
        console.error('Error fetching admin commissions:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
// PUT /api/admin/commissions - Update commission status
// In Next.js this was PUT /api/admin/commissions with body { commissionId, status }
router.put('/', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { commissionId, status } = req.body;
        if (!commissionId || !status) {
            return res.status(400).json({ error: 'commissionId and status are required' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const result = yield db.collection('commissions').findOneAndUpdate({ _id: new mongodb_1.ObjectId(commissionId) }, { $set: { status: status, updatedAt: new Date() } }, { returnDocument: 'after' });
        if (!result) {
            return res.status(404).json({ error: 'Commission not found' });
        }
        const updatedCommission = Object.assign(Object.assign({}, result), { id: result._id.toString() });
        res.json(updatedCommission);
    }
    catch (error) {
        console.error('Error updating commission:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
