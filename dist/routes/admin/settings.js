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
 * /admin/settings:
 *   get:
 *     summary: Get all settings
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Key-value settings object
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
        return res.json(settings);
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
}));
/**
 * @swagger
 * /admin/settings:
 *   post:
 *     summary: Update a setting
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - value
 *     responses:
 *       200:
 *         description: Setting updated
 */
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, value } = req.body;
        if (!name || value === undefined) {
            return res.status(400).json({ error: 'Invalid setting format. "name" and "value" are required.' });
        }
        const client = yield database_1.default;
        const db = client.db();
        yield db.collection('settings').updateOne({ name: name }, { $set: { name, value } }, { upsert: true });
        return res.json({ message: `Setting '${name}' updated successfully` });
    }
    catch (error) {
        console.error('Error updating setting:', error);
        return res.status(500).json({ error: 'Failed to update setting' });
    }
}));
exports.default = router;
