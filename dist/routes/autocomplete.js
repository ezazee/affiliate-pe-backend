"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const router = express_1.default.Router();
router.get('/', (req, res) => {
    const { text } = req.query; // Next.js used 'text' param
    if (!text) {
        return res.status(400).json({ error: 'Text parameter is required' });
    }
    const queryText = text;
    // Simple mock suggestions - to match original Next.js implementation
    const mockSuggestions = [
        `${queryText} Street, Jakarta`,
        `${queryText} Road, Jakarta Selatan`,
        `${queryText} Avenue, Jakarta Pusat`,
    ].filter(addr => addr.length > queryText.length + 5);
    return res.json(mockSuggestions);
});
exports.default = router;
