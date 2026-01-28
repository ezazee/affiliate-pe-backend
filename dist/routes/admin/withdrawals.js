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
const notification_service_1 = require("../../services/notification-service");
const router = express_1.default.Router();
/**
 * @swagger
 * /admin/withdrawals:
 *   get:
 *     summary: List all withdrawal requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of withdrawals
 *   put:
 *     summary: Approve or reject withdrawal
 *     tags: [Admin]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [approved, rejected, completed]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal updated
 */
// GET /api/admin/withdrawals
router.get('/', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const withdrawals = yield db.collection('withdrawals')
            .find({})
            .sort({ requestedAt: -1 })
            .toArray();
        const formattedWithdrawals = withdrawals.map(withdrawal => (Object.assign(Object.assign({}, withdrawal), { id: withdrawal._id.toString() })));
        res.json(formattedWithdrawals);
    }
    catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
// PUT /api/admin/withdrawals/:id
router.put('/:id', auth_1.authenticateUser, auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;
        if (!status) {
            return res.status(400).json({ error: 'status is required' });
        }
        const client = yield database_1.default;
        const db = client.db();
        // Get withdrawal details
        const withdrawal = yield db.collection('withdrawals').findOne({ _id: new mongodb_1.ObjectId(id) });
        if (!withdrawal) {
            return res.status(404).json({ error: 'Withdrawal not found' });
        }
        // Get affiliator info for notifications
        const affiliator = yield db.collection('users').findOne({ _id: new mongodb_1.ObjectId(withdrawal.affiliatorId) });
        const result = yield db.collection('withdrawals').findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, {
            $set: Object.assign({ status, processedAt: new Date(), updatedAt: new Date() }, (status === 'rejected' && rejectionReason && { rejectionReason }))
        }, { returnDocument: 'after' });
        // Handle commission status based on withdrawal status
        const commissionsCollection = db.collection('commissions');
        // Find all reserved commissions for this withdrawal
        // Note: New backend types might differ, ensuring compatibility with DB schema
        const reservedCommissions = yield commissionsCollection.find({
            withdrawalId: id,
            status: 'reserved'
        }).toArray();
        if (status === 'approved' || status === 'completed') {
            // Mark reserved commissions as withdrawn (final)
            for (const reserved of reservedCommissions) {
                yield commissionsCollection.updateOne({ _id: reserved._id }, { $set: { status: 'withdrawn' } });
            }
        }
        else if (status === 'rejected') {
            // Kembalikan saldo
            for (const reserved of reservedCommissions) {
                // If it was partial and has parent, we might need to revert logic.
                // Replicating Next.js logic:
                if (reserved.isPartial && reserved.parentCommissionId) {
                    // Delete reserved commission
                    yield commissionsCollection.deleteOne({ _id: reserved._id });
                    // Kembalikan usedAmount di parent commission
                    yield commissionsCollection.updateOne({ _id: new mongodb_1.ObjectId(reserved.parentCommissionId) }, { $inc: { usedAmount: -reserved.amount } });
                }
                else {
                    // If it's not partial/no parent logic, we might just un-reserve it?
                    // Next.js code only handled the isPartial && parentCommissionId case explicitly in the loop for 'returning saldo'.
                    // Wait, if it's a full commission withdrawal that got rejected, it should probably go back to 'approved' or 'paid' status?
                    // The Next.js code shown in Step 82 ONLY handles the `if (reserved.isPartial && reserved.parentCommissionId)` block inside the loop.
                    // This implies full commissions might stay 'reserved' or requires manual intervention?
                    // Or maybe they don't use 'reserved' status for full withdrawals?
                    // I will stick EXACTLY to the Next.js logic provided.
                }
            }
        }
        // Send notifications
        try {
            if (affiliator && affiliator.email) {
                if (status === 'approved' || status === 'completed') {
                    yield notification_service_1.affiliatorNotifications.withdrawalApproved((withdrawal.amount || 0).toLocaleString('id-ID'), new Date().toLocaleString('id-ID'), affiliator.email);
                    // Update balance notification
                    const allCommissions = yield db.collection('commissions').find({
                        affiliatorId: withdrawal.affiliatorId,
                        status: 'paid'
                    }).toArray();
                    const availableBalance = allCommissions.reduce((sum, commission) => {
                        const usedAmount = commission.usedAmount || 0;
                        return sum + (commission.amount - usedAmount);
                    }, 0);
                    yield notification_service_1.affiliatorNotifications.balanceUpdated(availableBalance.toLocaleString('id-ID'), affiliator.email);
                }
                else if (status === 'rejected') {
                    yield notification_service_1.affiliatorNotifications.withdrawalRejected((withdrawal.amount || 0).toLocaleString('id-ID'), rejectionReason || 'Admin rejection', affiliator.email);
                }
            }
        }
        catch (notificationError) {
            console.error('❌ Failed to send notifications for withdrawal update:', notificationError);
        }
        res.json(result);
    }
    catch (error) {
        console.error('Error updating withdrawal:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
}));
exports.default = router;
