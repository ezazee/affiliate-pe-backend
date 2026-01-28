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
// POST /admin/purge
/**
 * @swagger
 * /admin/purge:
 *   post:
 *     summary: Purge entire database (Dev/Test only)
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Purge results
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const collectionsToPurge = ['users', 'products', 'orders', 'commissions', 'affiliateLinks', 'withdrawals', 'settings'];
        const results = [];
        for (const collectionName of collectionsToPurge) {
            try {
                const result = yield db.collection(collectionName).deleteMany({});
                results.push({
                    collection: collectionName,
                    deletedCount: result.deletedCount
                });
            }
            catch (e) {
                // Ignore NamespaceNotFound
                if (e.codeName !== 'NamespaceNotFound') {
                    throw e;
                }
            }
        }
        try {
            yield db.dropCollection('affiliatelinks'); // Handle lower case potential issue
            results.push({ collection: 'affiliatelinks', status: 'dropped' });
        }
        catch (e) { /* ignore */ }
        return res.json({
            success: true,
            message: 'Database purge complete',
            results
        });
    }
    catch (error) {
        console.error('Purge error:', error);
        return res.status(500).json({ error: 'Failed to purge database', details: error.message });
    }
}));
exports.default = router;
