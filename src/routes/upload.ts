import express from 'express';
import multer from 'multer';
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client, bucketName, publicUrl } from '../lib/s3';

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

        const timestamp = Date.now();
        const fileExtension = file.originalname.split('.').pop();
        
        // Dynamic folder support (default to 'general' if not specified)
        const folder = req.body.type || 'general';
        const filename = `${folder}/${folder}-${timestamp}.${fileExtension}`;

        // Upload to Minio
        await s3Client.send(new PutObjectCommand({
            Bucket: bucketName,
            Key: filename,
            Body: file.buffer,
            ContentType: file.mimetype,
        }));

        // Generate URL
        const finalUrl = `${publicUrl}/${bucketName}/${filename}`;

        const response: any = {
            success: true,
            url: finalUrl,
            filename: filename,
            size: file.size,
            sizeKB: Math.round(file.size / 1024),
            type: file.mimetype
        };

        if (sizeWarning) {
            response.warning = sizeWarning;
        }

        return res.json(response);
    } catch (error) {
        console.error('Error uploading image to Minio:', error);
        return res.status(500).json({ error: 'Failed to upload image' });
    }
});

export default router;
