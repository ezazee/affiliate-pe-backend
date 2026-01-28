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
exports.getAffiliateLinkByAffiliatorProduct = exports.getUserByReferralCode = exports.getProductBySlug = void 0;
const database_1 = __importDefault(require("../config/database"));
const getProductBySlug = (slug) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield database_1.default;
    const db = client.db();
    const product = yield db.collection('products').findOne({ slug });
    if (product) {
        return Object.assign(Object.assign({}, product), { id: product._id.toString() });
    }
    return null;
});
exports.getProductBySlug = getProductBySlug;
const getUserByReferralCode = (referralCode) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield database_1.default;
    const db = client.db();
    const user = yield db.collection('users').findOne({ referralCode });
    if (user) {
        return Object.assign(Object.assign({}, user), { id: user._id.toString() });
    }
    return null;
});
exports.getUserByReferralCode = getUserByReferralCode;
const getAffiliateLinkByAffiliatorProduct = (affiliatorId, productId) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const client = yield database_1.default;
    const db = client.db();
    // Check various ID formats if needed, but assuming canonical string for now based on other code
    const link = yield db.collection('affiliateLinks').findOne({
        affiliatorId,
        productId // Canonical string ID usually
    });
    if (link) {
        return Object.assign(Object.assign({}, link), { id: (_a = link._id) === null || _a === void 0 ? void 0 : _a.toString() });
    }
    return null;
});
exports.getAffiliateLinkByAffiliatorProduct = getAffiliateLinkByAffiliatorProduct;
