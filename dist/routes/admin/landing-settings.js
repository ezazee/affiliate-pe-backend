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
 * /admin/landing-settings:
 *   get:
 *     summary: Get landing page settings
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Landing page settings
 */
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield database_1.default;
        const db = client.db();
        const settingsCursor = db.collection('settings').find({});
        const settingsArray = yield settingsCursor.toArray();
        const settings = settingsArray.reduce((acc, setting) => {
            acc[setting.name] = setting.value;
            return acc;
        }, {});
        const landingSettings = {
            aboutTitle: settings.landingAboutTitle || 'Tentang PE Skinpro',
            aboutDescription: settings.landingAboutDescription || 'PE Skin Professional didirikan pada satu dekade yang lalu dengan tujuan untuk memproduksi produk perawatan kecantikan pribadi yang terjangkau oleh semua orang.',
            aboutImage: settings.landingAboutImage || '',
            heroTitle: settings.landingHeroTitle || 'Dapatkan Penghasilan Hingga 10%',
            heroDescription: settings.landingHeroDescription || 'Bergabunglah dengan program affiliate PE Skinpro dan dapatkan komisi menarik dari setiap penjualan.',
            instagramUrl: settings.landingInstagramUrl || 'https://www.instagram.com/peskinproid',
            tiktokUrl: settings.landingTiktokUrl || 'https://www.tiktok.com/@peskinproid',
            shopeeUrl: settings.landingShopeeUrl || 'https://shopee.co.id/peskinpro_id',
            websiteUrl: settings.landingWebsiteUrl || 'https://peskinpro.id',
            whatsappNumber: settings.landingWhatsappNumber || '0821-2316-7895',
            email: settings.landingEmail || 'adm.peskinproid@gmail.com',
            footerDescription: settings.landingFooterDescription || 'Program affiliate resmi PE Skinpro. Dapatkan komisi menarik dari setiap penjualan produk skincare berkualitas.',
        };
        return res.json(landingSettings);
    }
    catch (error) {
        console.error('Error fetching landing settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
}));
/**
 * @swagger
 * /admin/landing-settings:
 *   post:
 *     summary: Update landing page settings
 *     tags: [Admin]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Settings updated
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const body = req.body;
        if (!body || typeof body !== 'object') {
            return res.status(400).json({ error: 'Invalid request body' });
        }
        const client = yield database_1.default;
        const db = client.db();
        const updatePromises = Object.entries(body).map(([key, value]) => {
            const settingName = `landing${key.charAt(0).toUpperCase() + key.slice(1)}`;
            return db.collection('settings').updateOne({ name: settingName }, { $set: { name: settingName, value } }, { upsert: true });
        });
        yield Promise.all(updatePromises);
        return res.json({ message: 'Landing page settings updated successfully' });
    }
    catch (error) {
        console.error('Error updating landing settings:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
}));
exports.default = router;
