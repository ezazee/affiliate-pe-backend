import express from 'express';
import clientPromise from '../config/database';
import { ObjectId } from 'mongodb';
import { Product } from '../types/product';
import { authenticateUser, requireAuth } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Retrieve a list of active products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: A list of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   price:
 *                     type: number
 *                   slug:
 *                     type: string
 */
// GET /products (List all products - modeled after affiliator/products/route.ts if that's the main list)
// or just generic list if needed. Will check the content of affiliator/products/route.ts first.
// If this file is intended to map src/app/api/products/[id], it primarily handles ID operations.
// I will create a base route for / (if needed) and /:id.

// PUT /products/:id
router.put('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, price, description, commissionType, commissionValue, isActive, imageUrl } = req.body;

        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }

        const client = await clientPromise;
        const db = client.db();

        // Check for duplicate slug
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
        return res.json({ ...updatedProduct, id: updatedProduct?._id.toString() });
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// DELETE /products/:id
router.delete('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const client = await clientPromise;
        const db = client.db();

        const result = await db.collection<Product>('products').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

// GET /products/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const client = await clientPromise;
        const db = client.db();

        const product = await db.collection<Product>('products').findOne({ _id: new ObjectId(id) });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const { id: originalId, ...rest } = product;
        const formattedProduct = {
            ...rest,
            id: product._id.toString(),
        };

        return res.json(formattedProduct);
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});


// GET /products (List all active products)
router.get('/', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        // Fetch only active products for affiliators (or all if admin? logic was specific to affiliator route but let's make it general or query param based)
        // For now mirroring the affiliator/products route which filters isActive: true
        const products = await db.collection<Product>('products').find({ isActive: true }).toArray();

        const productsWithId = products.map((p) => ({
            ...p,
            id: p._id?.toString(),
        }));

        return res.json(productsWithId);
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;

