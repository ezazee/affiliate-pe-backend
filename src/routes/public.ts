import express from 'express';
import clientPromise from '../config/database';

const router = express.Router();

/**
 * @swagger
 * /public/landing-settings:
 *   get:
 *     summary: Get public landing page settings
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: Landing page settings
 */
// GET /api/public/landing-settings
router.get('/landing-settings', async (req, res) => {
    try {
        if (!process.env.MONGODB_URI) {
            return res.status(500).json({ error: 'MongoDB URI not configured' });
        }

        const client = await clientPromise;
        const db = client.db();
        const settingsCursor = db.collection('settings').find({});
        const settingsArray = await settingsCursor.toArray();

        // Transform array into a key-value object with proper typing
        const settings = settingsArray.reduce((acc, setting) => {
            acc[setting.name] = setting.value;
            return acc;
        }, {} as Record<string, any>);

        // Extract only landing page settings with defaults
        const landingSettings = {
            aboutTitle: settings.landingAboutTitle || 'Tentang PE Skinpro',
            aboutDescription: settings.landingAboutDescription || 'PE Skin Professional didirikan pada satu dekade yang lalu dengan tujuan untuk memproduksi produk perawatan kecantikan pribadi yang terjangkau oleh semua orang.',
            aboutImage: settings.landingAboutImage || '',
            heroTitle: settings.landingHeroTitle || 'Dapatkan Penghasilan Hingga 10%',
            heroDescription: settings.landingHeroDescription || 'Bergabunglah dengan program affiliate PE Skinpro dan dapatkan komisi menarik dari setiap penjualan.',
            instagramUrl: settings.landingInstagramUrl || 'https://www.instagram.com/peskinproid',
            tiktokUrl: settings.landingTiktokUrl || 'https://www.tiktok.com/@peskinproid',
            shopeeUrl: settings.landingShopeeUrl || 'https://shopee.co.id/peskinpro_id',
            websiteUrl: settings.landingWebsiteUrl || 'https://peskinpro.id',
            whatsappNumber: settings.landingWhatsappNumber || '0821-2316-7895',
            email: settings.landingEmail || 'adm.peskinproid@gmail.com',
            footerDescription: settings.landingFooterDescription || 'Program affiliate resmi PE Skinpro. Dapatkan komisi menarik dari setiap penjualan produk skincare berkualitas.',
        };

        return res.json(landingSettings);
    } catch (error) {
        console.error('Error fetching public landing page settings:', error);
        // Return default settings on error
        const defaultSettings = {
            aboutTitle: 'Tentang PE Skinpro',
            aboutDescription: 'PE Skin Professional didirikan pada satu dekade yang lalu dengan tujuan untuk memproduksi produk perawatan kecantikan pribadi yang terjangkau oleh semua orang.',
            aboutImage: '',
            heroTitle: 'Dapatkan Penghasilan Hingga 10%',
            heroDescription: 'Bergabunglah dengan program affiliate PE Skinpro dan dapatkan komisi menarik dari setiap penjualan.',
            instagramUrl: 'https://www.instagram.com/peskinproid',
            tiktokUrl: 'https://www.tiktok.com/@peskinproid',
            shopeeUrl: 'https://shopee.co.id/peskinpro_id',
            websiteUrl: 'https://peskinpro.id',
            whatsappNumber: '0821-2316-7895',
            email: 'adm.peskinproid@gmail.com',
            footerDescription: 'Program affiliate resmi PE Skinpro. Dapatkan komisi menarik dari setiap penjualan produk skincare berkualitas.',
        };
        return res.json(defaultSettings);
    }
});

// GET /api/public/products
/**
 * @swagger
 * /public/products:
 *   get:
 *     summary: Get active products (Public)
 *     tags: [Public]
 *     responses:
 *       200:
 *         description: List of active products
 */
router.get('/products', async (req, res) => {
    try {
        const client = await clientPromise;
        const db = client.db();

        // Fetch only active products for public landing page
        const products = await db.collection('products')
            .find({ isActive: true })
            .project({
                name: 1,
                slug: 1,
                price: 1,
                description: 1,
                imageUrl: 1,
                commissionType: 1,
                commissionValue: 1,
                isActive: 1
            })
            .limit(20) // Limit products for performance
            .sort({ createdAt: -1 }) // Show newest first
            .toArray();

        // Map _id to id and format response
        const productsWithId = products.map((p) => ({
            id: p._id.toString(),
            name: p.name,
            slug: p.slug,
            price: p.price,
            description: p.description,
            imageUrl: p.imageUrl,
            commissionType: p.commissionType,
            commissionValue: p.commissionValue,
            isActive: p.isActive
        }));

        // Set cache headers - Express way
        res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

        return res.json(productsWithId);
    } catch (error) {
        console.error('Error fetching public products:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

export default router;
