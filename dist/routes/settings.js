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
const router = express_1.default.Router();
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const settingsCollection = db.collection('settings');
        const minimumWithdrawalSetting = yield settingsCollection.findOne({ name: 'minimumWithdrawal' });
        const adminWhatsAppSetting = yield settingsCollection.findOne({ name: 'adminWhatsApp' });
        const minimumWithdrawalAmount = (minimumWithdrawalSetting === null || minimumWithdrawalSetting === void 0 ? void 0 : minimumWithdrawalSetting.value) || 50000;
        const adminWhatsApp = (adminWhatsAppSetting === null || adminWhatsAppSetting === void 0 ? void 0 : adminWhatsAppSetting.value) || '628123456789';
        return res.json({
            minimumWithdrawal: minimumWithdrawalAmount,
            adminWhatsApp: adminWhatsApp
        });
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
}));
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, value } = req.body;
        if (!name || value === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const client = yield database_1.default;
        const db = client.db();
        yield db.collection('settings').updateOne({ name }, { $set: { name, value, updatedAt: new Date() } }, { upsert: true });
        return res.json({ success: true, message: 'Setting updated successfully' });
    }
    catch (error) {
        console.error('Error updating setting:', error);
        return res.status(500).json({ error: 'Failed to update setting' });
    }
}));
exports.default = router;
