import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    const { text } = req.query; // Next.js used 'text' param

    if (!text) {
        return res.status(400).json({ error: 'Text parameter is required' });
    }

    const queryText = text as string;

    // Simple mock suggestions - to match original Next.js implementation
    const mockSuggestions = [
        `${queryText} Street, Jakarta`,
        `${queryText} Road, Jakarta Selatan`,
        `${queryText} Avenue, Jakarta Pusat`,
    ].filter(addr => addr.length > queryText.length + 5);

    return res.json(mockSuggestions);
});

export default router;
