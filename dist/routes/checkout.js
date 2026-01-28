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
const dataService_1 = require("../services/dataService");
const router = express_1.default.Router();
/**
 * @swagger
 * /checkout/{productSlug}:
 *   get:
 *     summary: Validate checkout details
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: productSlug
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: ref
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Checkout details (product, affiliator, link)
 *       400:
 *         description: Missing referral code
 *       404:
 *         description: Not found
 */
// GET /api/checkout/:productSlug
router.get('/:productSlug', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productSlug } = req.params;
        const { ref } = req.query;
        const refCode = ref;
        if (!refCode) {
            return res.status(400).json({ error: 'Referral code is missing' });
        }
        // 1. Find the affiliator by their referral code
        const affiliator = yield (0, dataService_1.getUserByReferralCode)(refCode);
        if (!affiliator || affiliator.status !== 'approved') {
            return res.status(404).json({ error: 'Affiliator not found or not approved' });
        }
        // 2. Find the product by its slug
        const product = yield (0, dataService_1.getProductBySlug)(productSlug);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        // 3. Find the specific affiliate link for this affiliator and product
        // Note: checking strict types for IDs might be needed if services return strings vs ObjectIds
        const affiliateLink = yield (0, dataService_1.getAffiliateLinkByAffiliatorProduct)(affiliator.id, product.id);
        if (!affiliateLink || !affiliateLink.isActive) {
            return res.status(404).json({ error: 'Affiliate link not found or inactive' });
        }
        // All checks passed, return the data
        return res.json({ product, affiliateLink, affiliator });
    }
    catch (error) {
        console.error('Checkout API error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}));
exports.default = router;
