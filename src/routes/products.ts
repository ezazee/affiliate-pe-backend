import express from 'express';
import { Product } from '../models';
import { authenticateUser, requireAuth } from '../middleware/auth';
import { Op } from 'sequelize';

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Retrieve a list of active products
 *     tags: [Products]
 */
router.get('/', async (req, res) => {
    try {
        const products = await Product.findAll({ where: { isActive: true } });
        return res.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Find by UUID id OR original _id
        const product = await Product.findOne({ 
            where: {
                [Op.or]: [
                    { id: id },
                    { _id: id }
                ]
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.json(product);
    } catch (error) {
        console.error('Error fetching product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
 */
router.put('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, price, description, commissionType, commissionValue, isActive, imageUrl } = req.body;

        if (!name || !slug || !price || !commissionType || !commissionValue) {
            return res.status(400).json({ error: 'Missing required product fields' });
        }

        // Find product first
        const product = await Product.findOne({ 
            where: {
                [Op.or]: [
                    { id: id },
                    { _id: id }
                ]
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Check for duplicate slug (excluding CURRENT product)
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
 * /products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 */
router.delete('/:id', authenticateUser, requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findOne({ 
            where: {
                [Op.or]: [
                    { id: id },
                    { _id: id }
                ]
            }
        });

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        await product.destroy();
        return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;

