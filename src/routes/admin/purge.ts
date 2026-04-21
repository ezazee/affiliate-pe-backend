/**
 * DEPRECATED: This API route has been removed for security reasons.
 * Database purging functionality is now exclusively available via the internal script:
 * src/scripts/purge.ts
 * 
 * To purge transaction data safely, run:
 * npx ts-node src/scripts/purge.ts
 */

import express from 'express';

const router = express.Router();

router.all('*', (req, res) => {
    res.status(410).json({
        error: 'Gone',
        message: 'This feature is no longer available via API for security reasons. Please use the internal CLI scripts.'
    });
});

export default router;
