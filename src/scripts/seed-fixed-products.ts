import { Product } from '../models';

const fixedProducts = [
    {
        sku: 'INTIMATE-007',
        name: 'Intimate Feminine Mousse Cleanser',
        slug: 'intimate-feminine-mousse-cleanser',
        price: 125000,
        commissionType: 'percentage',
        commissionValue: 10,
        type: 'single',
        description: 'Pembersih area kewanitaan yang lembut dengan formula mousse.'
    },
    {
        sku: 'GLOW-006',
        name: 'Skin Awakening Glow Serum',
        slug: 'skin-awakening-glow-serum',
        price: 150000,
        commissionType: 'percentage',
        commissionValue: 10,
        type: 'single',
        description: 'Serum untuk mencerahkan dan memberikan efek glowing pada wajah.'
    },
    {
        sku: 'HYDRO-005',
        name: 'Hydro Restorative Cream',
        slug: 'hydro-restorative-cream',
        price: 135000,
        commissionType: 'percentage',
        commissionValue: 10,
        type: 'single',
        description: 'Krim pelembab intensif untuk memperbaiki skin barrier.'
    },
    {
        sku: 'PE-PAD-004',
        name: 'PE Prebiotic Pore-EX Facial Pad',
        slug: 'pe-prebiotic-pore-ex-facial-pad',
        price: 145000,
        commissionType: 'percentage',
        commissionValue: 10,
        type: 'single',
        description: 'Kapas wajah praktis dengan kandungan prebiotik untuk mengecilkan pori.'
    },
    {
        sku: 'HONEY-003',
        name: 'Honey Cleansing Gel',
        slug: 'honey-cleansing-gel',
        price: 95000,
        commissionType: 'percentage',
        commissionValue: 10,
        type: 'single',
        description: 'Gel pembersih wajah dengan madu alami untuk kulit sensitif.'
    },
    {
        sku: 'VIT-C-DAY-001',
        name: 'Vit C Tone-Up Daycream SPF 50',
        slug: 'vit-c-tone-up-daycream-spf-50',
        price: 110000,
        commissionType: 'percentage',
        commissionValue: 10,
        type: 'single',
        description: 'Krim siang dengan Vitamin C dan perlindungan sinar matahari.'
    },
    {
        sku: 'CICA-B5-001',
        name: 'CICA-B5 Refreshing Toner',
        slug: 'cica-b5-refreshing-toner',
        price: 85000,
        commissionType: 'percentage',
        commissionValue: 10,
        type: 'single',
        description: 'Toner penyegar dengan Cica dan B5 untuk menenangkan kulit.'
    }
];

export const seedFixedProducts = async () => {
    console.log('🌱 Starting to seed fixed products...');
    
    for (const prod of fixedProducts) {
        try {
            const [product, created] = await Product.findOrCreate({
                where: { sku: prod.sku },
                defaults: {
                    ...prod,
                    weight: 100,
                    length: 1,
                    width: 1,
                    height: 1,
                    isActive: true,
                    stock: 0
                } as any
            });

            if (created) {
                console.log(`✅ Created new product: ${prod.name} (${prod.sku})`);
            } else {
                // Update existing product to match names and prices if needed
                product.name = prod.name;
                product.price = prod.price;
                await product.save();
                console.log(`🔄 Updated existing product: ${prod.name} (${prod.sku})`);
            }
        } catch (error) {
            console.error(`❌ Error processing product ${prod.sku}:`, error);
        }
    }
    
    console.log('🏁 Seeding finished.');
};
