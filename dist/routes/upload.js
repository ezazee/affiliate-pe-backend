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
const blob_1 = require("@vercel/blob");
const multer_1 = __importDefault(require("multer"));
const router = express_1.default.Router();
const upload = (0, multer_1.default)(); // Handle multipart/form-data
router.post('/', upload.single('file'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'File must be an image' });
        }
        // Validate file size (max 2MB)
        const maxSize = 2 * 1024 * 1024;
        const recommendedSize = 500 * 1024;
        if (file.size > maxSize) {
            return res.status(400).json({
                error: 'File size must be less than 2MB',
                actualSize: `${(file.size / 1024 / 1024).toFixed(2)}MB`
            });
        }
        let sizeWarning = null;
        if (file.size > recommendedSize) {
            sizeWarning = `Image size is ${(file.size / 1024).toFixed(0)}KB. Consider compressing.`;
        }
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return res.status(500).json({ error: 'Blob storage not configured' });
        }
        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        const filename = `landing-about-${timestamp}.${fileExtension}`;
        const blob = yield (0, blob_1.put)(filename, file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: file.mimetype,
        });
        const response = {
            success: true,
            url: blob.url,
            filename: blob.pathname,
            size: file.size,
            sizeKB: Math.round(file.size / 1024),
            type: file.mimetype
        };
        if (sizeWarning) {
            response.warning = sizeWarning;
        }
        return res.json(response);
    }
    catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ error: 'Failed to upload image' });
    }
}));
exports.default = router;
