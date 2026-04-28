import { seedFixedProducts } from './seed-fixed-products';
import db from '../config/database';

async function restore() {
    try {
        await db.authenticate();
        console.log('✅ Connected to database for restoration.');
        await seedFixedProducts();
        console.log('✅ Products restored successfully.');
    } catch (error) {
        console.error('❌ Restoration failed:', error);
    } finally {
        await db.close();
    }
}

restore();
