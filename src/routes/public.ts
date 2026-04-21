import express from 'express';
import { Op } from 'sequelize';
import { Setting, Product, User, AffiliateLink } from '../models';

const router = express.Router();

/**
 * @swagger
 * /public/landing-settings:
 *   get:
 *     summary: Get public landing page settings
 *     tags: [Public]
 */
router.get('/landing-settings', async (req, res) => {
    try {
        const settingsArray = await Setting.findAll();

        const settings = settingsArray.reduce((acc: Record<string, any>, setting: any) => {
            acc[setting.name] = setting.value;
            return acc;
        }, {} as Record<string, any>);

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
            whatsappNumber: settings.adminWhatsApp || settings.landingWhatsappNumber || '6281313711180',
            email: settings.landingEmail || 'adm.peskinproid@gmail.com',
            footerDescription: settings.landingFooterDescription || 'Program affiliate resmi PE Skinpro. Dapatkan komisi menarik dari setiap penjualan produk skincare berkualitas.',
        };

        return res.json(landingSettings);
    } catch (error) {
        console.error('Error fetching public landing page settings:', error);
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
            whatsappNumber: '6281313711180',
            email: 'adm.peskinproid@gmail.com',
            footerDescription: 'Program affiliate resmi PE Skinpro. Dapatkan komisi menarik dari setiap penjualan produk skincare berkualitas.',
        };
        return res.json(defaultSettings);
    }
});

/**
 * @swagger
 * /public/admin-whatsapp:
 *   get:
 *     summary: Get centralized admin WhatsApp number
 *     tags: [Public]
 */
router.get('/admin-whatsapp', async (req, res) => {
    try {
        const setting = await Setting.findOne({ where: { name: 'adminWhatsApp' } });
        return res.json({ 
            whatsappNumber: setting?.value || '6281313711180' 
        });
    } catch (error) {
        return res.json({ whatsappNumber: '6281313711180' });
    }
});

/**
 * @swagger
 * /public/products:
 *   get:
 *     summary: Get active products (Public)
 *     tags: [Public]
 */
router.get('/products', async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { isActive: true },
            limit: 20,
            order: [['createdAt', 'DESC']]
        });

        res.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

        return res.json(products);
    } catch (error) {
        console.error('Error fetching public products:', error);
        return res.status(500).json({ error: 'Something went wrong' });
    }
});

/**
 * @swagger
 * /public/store/{slug}:
 *   get:
 *     summary: Get affiliator storefront data by slug
 *     tags: [Public]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/store/:slug', async (req, res) => {
    try {
        const { slug } = req.params;

        // 1. Find user by storeSlug (Allow approved or pending for testing/initial setup)
        const user = await User.findOne({
            where: { 
                storeSlug: slug, 
                status: { [Op.in]: ['approved', 'pending'] } 
            },
            attributes: ['id', 'name', 'storeName', 'storeSlug', 'storeBio', 'storeThemeColor', 'storeSocialLinks', 'referralCode']
        });

        if (!user) {
            return res.status(404).json({ error: 'Store not found' });
        }

        // 2. Find selected products for this store
        const links = await AffiliateLink.findAll({
            where: { 
                affiliatorId: user.id, 
                isActive: true,
                showInStore: true 
            },
            include: [{
                model: Product,
                as: 'product',
                where: { isActive: true }
            }],
            order: [['updatedAt', 'DESC']]
        });

        return res.json({
            profile: user,
            links: links
        });
    } catch (error) {
        console.error('Error fetching store data:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
