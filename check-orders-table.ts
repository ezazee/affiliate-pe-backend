
import dotenv from 'dotenv';
dotenv.config();
import db from './src/config/database';

async function checkTableStructure() {
  try {
    await db.authenticate();
    console.log('✅ Connected to DB.');
    
    const [results] = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    
    console.log('📋 Columns in "orders" table:');
    results.forEach((col: any) => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTableStructure();
