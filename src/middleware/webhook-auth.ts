import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Middleware untuk memvalidasi signature dari internal payment gateway (peskin-payment-service)
 * Mencegah eksekusi callback pembayaran palsu dari pihak eksternal
 */
export const verifyInternalWebhook = (req: Request, res: Response, next: NextFunction) => {
    try {
        const receivedSignature = req.headers['x-gateway-signature'] as string;
        const source = req.headers['x-gateway-source'] as string;

        if (!receivedSignature || source !== 'peskin-payment-service') {
            console.warn(`[Security] 🚨 Percobaan akses ilegal ke webhook payment dari: ${req.ip}`);
            return res.status(403).json({ error: 'Akses Ditolak: Signature Internal Diperlukan' });
        }

        const secret = process.env.INTERNAL_WEBHOOK_SECRET || 'peskinpro-internal-secret-2024';
        const bodyString = JSON.stringify(req.body);

        // Re-generate HMAC-SHA256 signature to verify
        const computedSignature = crypto
            .createHmac('sha256', secret)
            .update(bodyString)
            .digest('hex');

        if (computedSignature !== receivedSignature) {
            console.warn(`[Security] 🚨 Signature tidak cocok untuk invoice: ${req.body.invoiceNumber}`);
            return res.status(401).json({ error: 'Akses Ditolak: Signature Tidak Valid' });
        }

        // Signature valid, silakan lanjut
        next();
    } catch (error) {
        console.error('[Security] Error saat verifikasi webhook signature:', error);
        return res.status(500).json({ error: 'Internal Security Error' });
    }
};
