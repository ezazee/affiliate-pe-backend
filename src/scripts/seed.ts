import db from '../config/database';
import { User, Product } from '../models';
import { Security } from '../lib/security';
import { CommissionType } from '../types/product';

const seed = async () => {
    try {
        console.log('🌱 Seeding database...');

        // Connect/Sync
        await db.authenticate();
        await db.sync({ alter: true });

        // 1. Create Admin
        const adminEmail = 'adm.peskinproid@gmail.com';
        const existingAdmin = await User.findOne({ where: { email: adminEmail } });

        if (!existingAdmin) {
            const hashedAdminPassword = await Security.hashPassword('admin123');
            await User.create({
                name: 'Admin PE Skinpro',
                email: adminEmail,
                password: hashedAdminPassword,
                role: 'admin',
                status: 'approved',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('✅ Admin user created: admin@peskinpro.com / admin123');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }

        // 2. Create Affiliator
        const affiliatorEmail = 'reza@affiliate.com';
        const existingAffiliator = await User.findOne({ where: { email: affiliatorEmail } });

        if (!existingAffiliator) {
            const hashedAffiliatorPassword = await Security.hashPassword('affiliate123');
            await User.create({
                name: 'Reza Affiliator',
                email: affiliatorEmail,
                password: hashedAffiliatorPassword,
                role: 'affiliator',
                status: 'approved',
                referralCode: 'REZA2026',
                registrationNumber: 'REG-REZA2026',
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('✅ Affiliator user created: reza@affiliate.com / affiliate123');
        } else {
            console.log('ℹ️ Affiliator user already exists.');
        }

        // 3. Create Products (Initial Product Catalog)
        const storageBase = `${process.env.MINIO_PUBLIC_URL}/${process.env.MINIO_BUCKET}`;
        const getStorageUrl = (path: string) => `${storageBase}/products/${path}`;

        const products: any[] = [
            {
                _id: '696df0bd64e10ac5427a03f4',
                name: 'CICA-B5 Refreshing Toner',
                slug: 'cica-b5-refreshing-toner',
                price: 144000,
                description: 'Toner dengan CICA dan Vitamin B5 untuk menenangkan kulit, menjaga kelembapan, dan memperkuat skin barrier.',
                imageUrl: getStorageUrl('CICA-B5-REFRESHING'),
                commissionType: 'percentage' as CommissionType,
                commissionValue: 10,
                isActive: true
            },
            {
                _id: '696df0bd64e10ac5427a03fa',
                name: 'Intimate Feminine Mousse Cleanser',
                slug: 'intimate-feminine-mousse-cleanser',
                price: 144000,
                description: 'Pembersih area kewanitaan berbentuk mousse dengan formula lembut untuk penggunaan harian.',
                imageUrl: getStorageUrl('600x750_PREBIOTIC-FEMININE-MOUSSE-CLEANSER.jpg'),
                commissionType: 'percentage' as CommissionType,
                commissionValue: 10,
                isActive: true
            },
            {
                _id: '696df0bd64e10ac5427a03f5',
                name: 'Vit C Tone-Up Daycream SPF 50',
                slug: 'vit-c-tone-up-daycream-spf-50',
                price: 144000,
                description: 'Day cream dengan Vitamin C dan SPF 50 untuk mencerahkan kulit sekaligus melindungi dari sinar UV.',
                imageUrl: getStorageUrl('600x750_VIT-C-TONE-UP--DAY-CREAM-SPF50.jpg'),
                commissionType: 'percentage' as CommissionType,
                commissionValue: 10,
                isActive: true
            },
            {
                _id: '696df0bd64e10ac5427a03f7',
                name: 'PE Prebiotic Pore-EX Facial Pad',
                slug: 'pe-prebiotic-pore-ex-facial-pad',
                price: 144000,
                description: 'Facial pad dengan prebiotic untuk membantu membersihkan pori dan menjaga keseimbangan mikrobioma kulit.',
                imageUrl: getStorageUrl('600x750_PREBIOTIC-PORE-EX.jpg'),
                commissionType: 'percentage' as CommissionType,
                commissionValue: 10,
                isActive: true
            },
            {
                _id: '696df0bd64e10ac5427a03f6',
                name: 'Honey Cleansing Gel',
                slug: 'honey-cleansing-gel',
                price: 144000,
                description: 'Facial cleanser berbahan madu untuk membersihkan wajah dengan lembut tanpa membuat kulit kering.',
                imageUrl: getStorageUrl('HONEY_CLEANSING_GEL'),
                commissionType: 'percentage' as CommissionType,
                commissionValue: 10,
                isActive: true
            },
            {
                _id: '696df0bd64e10ac5427a03f9',
                name: 'Skin Awakening Glow Serum',
                slug: 'skin-awakening-glow-serum',
                price: 100000,
                description: 'Serum pencerah yang membantu membuat kulit tampak lebih glowing dan sehat.',
                imageUrl: getStorageUrl('600x750_SKIN-AWAKENING-GLOW-SERUM.jpg'),
                commissionType: 'percentage' as CommissionType,
                commissionValue: 10,
                isActive: true
            },
            {
                _id: '696df0bd64e10ac5427a03f8',
                name: 'Hydro Restorative Cream',
                slug: 'hydro-restorative-cream',
                price: 144000,
                description: 'Moisturizer untuk membantu memperbaiki skin barrier dan menjaga hidrasi kulit sepanjang hari.',
                imageUrl: getStorageUrl('600x750_HYDRO-RESTORATIVE-CREAM.jpg'),
                commissionType: 'percentage' as CommissionType,
                commissionValue: 10,
                isActive: true
            },
        ];

        for (const productData of products) {
            const existingProduct = await Product.findOne({ where: { slug: productData.slug } });
            if (!existingProduct) {
                await Product.create({
                    ...productData,
                    createdAt: new Date(),
                    updatedAt: new Date()
                } as any);
                console.log(`✅ Product created: ${productData.name}`);
            } else {
                // Update existing product to match seed data
                await existingProduct.update({
                    ...productData,
                    updatedAt: new Date()
                });
                console.log(`ℹ️ Product updated: ${productData.name}`);
            }
        }

        console.log('✨ Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seed();
