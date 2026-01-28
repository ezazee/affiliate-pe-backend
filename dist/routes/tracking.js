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
const database_1 = __importDefault(require("../config/database"));
const dataService_1 = require("../services/dataService");
const router = express_1.default.Router();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { ref, productSlug } = req.body;
        if (!ref || !productSlug) {
            // Return 200 even on error to not break frontend tracking (as per original logic returning success true)
            // But better to log it.
            return res.json({ success: true, warning: 'ref and productSlug required' });
        }
        const affiliator = yield (0, dataService_1.getUserByReferralCode)(ref);
        if (!affiliator) {
            return res.json({ success: true });
        }
        const product = yield (0, dataService_1.getProductBySlug)(productSlug);
        if (!product) {
            return res.json({ success: true });
        }
        // Note: Affiliator ID handling - check if string or ObjectId needed.
        // dataService usually returns ID as string in .id field.
        const affiliateLink = yield (0, dataService_1.getAffiliateLinkByAffiliatorProduct)(affiliator.id, product.id);
        if (affiliateLink) {
            const client = yield database_1.default;
            const db = client.db();
            yield db.collection('link_clicks').insertOne({
                linkId: affiliateLink._id, // Using the _id from the link document
                createdAt: new Date(),
            });
        }
        return res.json({ success: true });
    }
    catch (error) {
        console.error('Error tracking click:', error);
        return res.json({ success: true });
    }
}));
exports.default = router;
