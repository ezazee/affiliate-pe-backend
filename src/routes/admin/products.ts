import express from 'express';
import { Product } from '../../models';
import { sendTemplateNotification } from '../../services/notification-service';
import { authenticateUser, requireAuth } from '../../middleware/auth';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @swagger
 * /admin/products:
 *   get:
 *     summary: Ambil daftar semua produk (Admin)
 *     tags: [Admin]
 */
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (error) {
        console.error('Error fetching admin products:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/products:
 *   post:
 *     summary: Buat produk baru
 *     tags: [Admin]
 */
router.post('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { name, slug, price, weight, description, commissionType, commissionValue, isActive, imageUrl } = req.body;

        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }

        // Check for duplicate slug
        const existingProduct = await Product.findOne({ where: { slug } });
        if (existingProduct) {
            return res.status(409).json({ error: 'Product with this slug already exists' });
        }

        const createdProduct = await Product.create({
            name,
            slug,
            price: Number(price),
            weight: Number(weight) || 500,
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive ?? true,
            imageUrl: imageUrl || '/placeholder.svg',
        });

        // Send notification to all affiliators
        try {
            await sendTemplateNotification(
                'new_product',
                {
                    productName: name,
                    slug: slug
                },
                { role: 'affiliator' }
            );

        } catch (notificationError) {
            console.error('❌ Failed to send new product notification:', notificationError);
        }

        res.status(201).json(createdProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/products/{id}:
 *   put:
 *     summary: Perbarui produk (Admin)
 *     tags: [Admin]
 */
router.put('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, price, weight, description, commissionType, commissionValue, isActive, imageUrl } = req.body;

        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }

        const product = await Product.findOne({
            where: {
                [Op.or]: [{ id: id }, { _id: id }]
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Verify duplicate slug if slug is changing
        const existingProductWithSlug = await Product.findOne({
            where: {
                slug,
                id: { [Op.ne]: product.id }
            }
        });
        if (existingProductWithSlug) {
            return res.status(409).json({ error: 'Product with this slug already exists' });
        }

        await product.update({
            name,
            slug,
            price: Number(price),
            weight: Number(weight) || product.weight || 500,
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive ?? true,
            imageUrl: imageUrl || '/placeholder.svg',
        });

        return res.json(product);
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /admin/products/{id}:
 *   delete:
 *     summary: Hapus produk (Admin)
 */
router.delete('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({
            where: {
                [Op.or]: [{ id: id }, { _id: id }]
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await product.destroy();
        return res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
