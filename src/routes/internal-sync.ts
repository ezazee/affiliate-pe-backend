import express from 'express';
import { Product, StockLog } from '../models';

const router = express.Router();

/**
 * Endpoint Internal untuk Sinkronisasi Stok dari Peskinext
 * Identifikasi produk menggunakan SKU
 */
router.post('/sync-stock', async (req, res) => {
    const { sku, stock, imageUrl, weight, length, width, height, apiKey } = req.body;

    // Security check (Menggunakan variable dari .env)
    const INTERNAL_API_KEY = process.env.MASTER_SYNC_KEY || 'PE-SKINPRO-INTERNAL-KEY';
    
    if (apiKey !== INTERNAL_API_KEY) {
        console.error(`[SYNC ERROR] Invalid API Key: ${apiKey}`);
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }

    console.log(`[SYNC RECEIVE] Received sync request for SKU ${sku}:`, {
        weight, length, width, height, stock, imageUrl
    });

    if (!sku) {
        return res.status(400).json({ error: 'SKU is required' });
    }

    try {
        const product = await Product.findOne({ where: { sku } });

        if (!product) {
            return res.status(404).json({ error: `Product with SKU ${sku} not found` });
        }

        const oldStock = product.stock;

        // Update stok jika ada
        if (stock !== undefined) {
            product.stock = stock;
        }

        // Update gambar jika ada
        if (imageUrl) {
            product.imageUrl = imageUrl;
        }

        // Update dimensions and weight if provided
        if (weight !== undefined) product.weight = Number(weight);
        if (length !== undefined) product.length = Number(length);
        if (width !== undefined) product.width = Number(width);
        if (height !== undefined) product.height = Number(height);

        // Debug Log
        console.log(`[DEBUG] Syncing product ${sku}. Weight: ${weight}, Dim: ${length}x${width}x${height}`);
        
        await product.save();

        // Record Log if stock changed
        if (stock !== undefined && Number(stock) !== oldStock) {
            const diff = Number(stock) - oldStock;
            await StockLog.create({
                productId: product.id,
                type: diff > 0 ? 'in' : 'out',
                quantity: diff,
                previousStock: oldStock,
                newStock: Number(stock),
                note: 'Sinkronisasi dari Pusat (Peskinext)',
                picName: 'Master Sync',
                picId: 'master-sync'
            });
        }

        console.log(`✅ Product synced for SKU ${sku}: Stock=${stock}, Image=${imageUrl ? 'Updated' : 'No change'}`);

        return res.json({ 
            success: true, 
            message: `Product ${product.name} synced successfully`,
            product: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                newStock: product.stock,
                imageUrl: product.imageUrl
            }
        });
    } catch (error) {
        console.error('❌ Error syncing stock:', error);
        return res.status(500).json({ error: 'Internal server error during sync' });
    }
});

export default router;
