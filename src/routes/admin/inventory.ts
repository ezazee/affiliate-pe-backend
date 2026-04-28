import express from 'express';
import { StockLog, Product, User } from '../../models';
import { requireAuth, requireAdmin } from '../../middleware/auth';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @swagger
 * /admin/inventory/history:
 *   get:
 *     summary: List all stock mutation history
 *     tags: [Admin]
 */
router.get('/history', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { productId, type, search } = req.query;
        
        const whereClause: any = {};
        if (productId) whereClause.productId = productId;
        if (type) whereClause.type = type;

        const logs = await StockLog.findAll({
            where: whereClause,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'sku', 'imageUrl'],
                    where: search ? {
                        name: { [Op.iLike]: `%${search}%` }
                    } : undefined
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: 100 // Limit for performance
        });

        return res.json(logs);
    } catch (error: any) {
        console.error('❌ Error fetching stock history:', error);
        return res.status(500).json({ error: 'Failed to fetch stock history', details: error.message });
    }
});

/**
 * @swagger
 * /admin/inventory/stats:
 *   get:
 *     summary: Get quick inventory stats
 */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { type: 'single' }
        });

        const stats = {
            totalItems: products.length,
            lowStock: products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) < 10).length,
            outOfStock: products.filter(p => (p.stock || 0) === 0).length,
            healthyStock: products.filter(p => (p.stock || 0) >= 10).length,
        };
        return res.json(stats);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /admin/inventory/adjust:
 *   post:
 *     summary: Manually adjust stock for a product
 */
router.post('/adjust', requireAuth, requireAdmin, async (req: any, res: any) => {
    try {
        const { productId, type, quantity, note } = req.body;
        const userId = req.user.userId;

        if (!productId || !type || quantity === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const admin = await User.findByPk(userId);
        const picName = admin?.name || admin?.email || 'Admin';

        const oldStock = product.stock;
        let newStock = oldStock;

        if (type === 'in' || type === 'return') {
            newStock = oldStock + Number(quantity);
        } else if (type === 'out' || type === 'adjustment') {
            // For adjustment, quantity could be positive or negative from UI
            newStock = oldStock + Number(quantity);
        }

        if (newStock < 0) newStock = 0;

        await product.update({ stock: newStock });

        // Record Log
        const log = await StockLog.create({
            productId: product.id,
            type,
            quantity: Number(quantity),
            previousStock: oldStock,
            newStock,
            note: note || `Penyesuaian manual oleh ${picName}`,
            picName,
            picId: userId
        });

        return res.json({
            success: true,
            message: 'Stock adjusted successfully',
            newStock,
            log
        });
    } catch (error: any) {
        console.error('❌ Error adjusting stock:', error);
        return res.status(500).json({ error: 'Failed to adjust stock', details: error.message });
    }
});

export default router;
