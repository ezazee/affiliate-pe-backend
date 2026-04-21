import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import * as pg from 'pg';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
    console.error('❌ DATABASE_URL is not defined in .env');
    // For now, don't exit to allow start, but connection will fail when used
}

const db = new Sequelize(dbUrl || '', {
    dialect: 'postgres',
    dialectModule: pg,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
    },
    dialectOptions: {
        // Required for some cloud providers like Neon/Supabase if SSL is needed
        // ssl: {
        //     require: true,
        //     rejectUnauthorized: false
        // }
    }
});

export const checkDatabaseConnection = async () => {
    try {
        await db.authenticate();
        console.log('✅ PostgreSQL connection has been established successfully.');
        return true;
    } catch (error) {
        console.error('❌ Unable to connect to the PostgreSQL database:', error);
        return false;
    }
};

export default db;
