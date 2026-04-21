const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('postgresql://dbutama:a1ZVrHhBncdJtOlf3914@103.85.59.38:5432/affiliate_peskinpro?sslmode=disable');

async function check() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const [results] = await sequelize.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'products';");
    console.log('Columns in products table:', results);
    
    const [products] = await sequelize.query("SELECT id, name, \"isActive\" FROM products LIMIT 5;");
    console.log('Sample products:', products);

  } catch (error) {
    console.error('Unable to connect to the database:', error);
  } finally {
    await sequelize.close();
  }
}

check();
