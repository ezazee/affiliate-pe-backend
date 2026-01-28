import express from 'express';
import { put } from '@vercel/blob';
import multer from 'multer';

const router = express.Router();
const upload = multer(); // Handle multipart/form-data

router.post('/', upload.single('file'), async (req, res) => {
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

        const blob = await put(filename, file.buffer, {
            access: 'public',
            token: process.env.BLOB_READ_WRITE_TOKEN,
            contentType: file.mimetype,
        });

        const response: any = {
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
    } catch (error) {
        console.error('Error uploading image:', error);
        return res.status(500).json({ error: 'Failed to upload image' });
    }
});

export default router;
