
import dotenv from 'dotenv';
dotenv.config();
import { Product } from './src/models';
import db from './src/config/database';

async function checkDatabase() {
  try {
    await db.authenticate();
    console.log('✅ Database connected.');
    
    const count = await Product.count();
    console.log(`📦 Total Products in database: ${count}`);
    
    if (count > 0) {
      const firstProduct = await Product.findOne();
      console.log('📄 Sample Product:', firstProduct?.name);
    } else {
      console.log('⚠️ Database is EMPTY for products table.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking database:', error);
    process.exit(1);
  }
}

checkDatabase();
