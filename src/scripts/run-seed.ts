import db from '../config/database';
import { seedFixedProducts } from './seed-fixed-products';

const run = async () => {
    try {
        await db.authenticate();
        console.log('📡 Database connected for seeding.');
        await seedFixedProducts();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

run();
