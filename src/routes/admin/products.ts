import express from 'express';
import { Product, BundleItem } from '../../models';
import { sendTemplateNotification } from '../../services/notification-service';
import { authenticateUser, requireAuth } from '../../middleware/auth';
import { Op } from 'sequelize';

const router = express.Router();

const FIXED_SKUS = [
    'INTIMATE-007',
    'GLOW-006',
    'HYDRO-005',
    'PE-PAD-004',
    'HONEY-003',
    'VIT-C-DAY-001',
    'CICA-B5-001'
];


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
 * /admin/products/{id}:
 *   get:
 *     summary: Ambil satu produk (Admin)
 *     tags: [Admin]
 */
router.get('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        const product = await Product.findOne({
            where: {
                [Op.or]: [
                    ...(isUUID ? [{ id: id }] : []),
                    { _id: id }
                ]
            },
            include: [
                {
                    model: BundleItem,
                    as: 'bundleItems',
                    include: [{ model: Product, as: 'componentProduct', attributes: ['id', 'name', 'sku'] }]
                }
            ]
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error fetching admin product by ID:', error);
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
        const { name, sku, slug, price, weight, length, width, height, type, description, commissionType, commissionValue, isActive, imageUrl, bundleItems } = req.body;

        if (!name || !sku || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields (including SKU)' });
        }

        // Check for duplicate slug
        const existingProduct = await Product.findOne({ where: { slug } });
        if (existingProduct) {
            return res.status(409).json({ error: 'Product with this slug already exists' });
        }

        const createdProduct = await Product.create({
            name,
            sku,
            slug,
            price: Number(price),
            weight: weight !== undefined ? Number(weight) : 100,
            length: length !== undefined ? Number(length) : 1,
            width: width !== undefined ? Number(width) : 1,
            height: height !== undefined ? Number(height) : 1,
            type: type || 'single',
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive ?? true,
            imageUrl: imageUrl || '/placeholder.svg',
        });

        // Save bundle items if type is bundle
        if (type === 'bundle' && Array.isArray(bundleItems)) {
            for (const item of bundleItems) {
                await BundleItem.create({
                    bundleProductId: createdProduct.id,
                    componentProductId: item.productId,
                    quantity: item.quantity
                });
            }
        }

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
        const { name, sku, slug, price, weight, length, width, height, type, description, commissionType, commissionValue, isActive, imageUrl, bundleItems } = req.body;

        if (!name || !sku || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields (including SKU)' });
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
            sku: sku || product.sku,
            slug,
            price: Number(price),
            weight: weight !== undefined ? Number(weight) : product.weight,
            length: length !== undefined ? Number(length) : product.length,
            width: width !== undefined ? Number(width) : product.width,
            height: height !== undefined ? Number(height) : product.height,
            type: type || product.type || 'single',
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive ?? true,
            imageUrl: imageUrl || '/placeholder.svg',
        });

        // Update bundle items if type is bundle
        if (type === 'bundle' && Array.isArray(bundleItems)) {
            // Delete old items first
            await BundleItem.destroy({ where: { bundleProductId: product.id } });
            // Add new ones
            for (const item of bundleItems) {
                await BundleItem.create({
                    bundleProductId: product.id,
                    componentProductId: item.productId,
                    quantity: item.quantity
                });
            }
        }

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

        // Prevent deletion of fixed products
        if (FIXED_SKUS.includes(product.sku)) {
            return res.status(403).json({ error: 'Cannot delete fixed products' });
        }

        await product.destroy();
        return res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
