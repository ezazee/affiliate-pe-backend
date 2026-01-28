import express from 'express';
import clientPromise from '../../config/database';
import { Product } from '../../types/product';
import { ObjectId } from 'mongodb';
import { sendTemplateNotification } from '../../services/notification-service';
import { authenticateUser, requireAuth } from '../../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Endpoint Manajemen Admin
 */

/**
 * @swagger
 * /admin/products:
 *   get:
 *     summary: Ambil daftar semua produk (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all products
 *   post:
 *     summary: Buat produk baru
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - price
 *               - commissionType
 *               - commissionValue
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               price:
 *                 type: number
 *               commissionType:
 *                 type: string
 *                 enum: [percentage, fixed]
 *               commissionValue:
 *                 type: number
 *               description:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *               imageUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Duplicate slug
 */
// GET /api/admin/products - List all products
router.get('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        const products = await db.collection<Product>('products').find({}).toArray();

        // Map _id to id for consistency with frontend
        const formattedProducts = products.map(product => {
            const { id, ...rest } = product; // Remove the original 'id' field if it exists
            return {
                ...rest,
                id: product._id.toString(), // Convert ObjectId to string
            };
        });

        res.json(formattedProducts);
    } catch (error) {
        console.error('Error fetching admin products:', error);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// POST /api/admin/products - Create a new product
router.post('/', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { name, slug, price, description, commissionType, commissionValue, isActive, imageUrl } = req.body;

        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }

        const client = await clientPromise;
        const db = client.db();

        // Check for duplicate slug
        const existingProduct = await db.collection<Product>('products').findOne({ slug });
        if (existingProduct) {
            return res.status(409).json({ error: 'Product with this slug already exists' });
        }

        const newProduct: any = { // using any to avoid strict type checks on optional fields for now, or Omit<Product, ...>
            name,
            slug,
            price: Number(price),
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive ?? true,
            imageUrl: imageUrl || '/placeholder.svg',
        };

        const result = await db.collection<Product>('products').insertOne(newProduct);
        const createdProduct = { ...newProduct, id: result.insertedId.toString() };

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

// PUT /api/admin/products/:id
/**
 * @swagger
 * /admin/products/{id}:
 *   put:
 *     summary: Perbarui produk (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Product updated
 */
router.put('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, price, description, commissionType, commissionValue, isActive, imageUrl } = req.body;

        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }

        const client = await clientPromise;
        const db = client.db();

        // Verify duplicate slug if slug is changing
        const existingProductWithSlug = await db.collection<Product>('products').findOne({
            slug,
            _id: { $ne: new ObjectId(id) }
        });
        if (existingProductWithSlug) {
            return res.status(409).json({ error: 'Product with this slug already exists' });
        }

        const updatedProductData: Partial<Product> = {
            name,
            slug,
            price: Number(price),
            description: description || '',
            commissionType,
            commissionValue: Number(commissionValue),
            isActive: isActive ?? true,
            imageUrl: imageUrl || '/placeholder.svg',
        };

        const result = await db.collection<Product>('products').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedProductData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const updatedProduct = await db.collection<Product>('products').findOne({ _id: new ObjectId(id) });
        const formattedProduct = updatedProduct ? { ...updatedProduct, id: updatedProduct._id.toString() } : null;

        return res.json(formattedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// DELETE /api/admin/products/:id
/**
 * @swagger
 * /admin/products/{id}:
 *   delete:
 *     summary: Hapus produk (Admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 */
router.delete('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection<Product>('products').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
