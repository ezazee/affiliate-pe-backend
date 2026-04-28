import Product from '../src/models/Product';
import db from '../src/config/database';

async function checkProductImage() {
    try {
        const sku = 'INTIMATE-007';
        const product = await Product.findOne({ where: { sku } });
        
        if (product) {
            console.log('Product found:');
            console.log('SKU:', product.sku);
            console.log('Name:', product.name);
            console.log('Image URL:', product.imageUrl);
        } else {
            console.log('Product not found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkProductImage();
