
import 'dotenv/config';
import db from '../config/database';
import { 
    User, 
    Product, 
    Order, 
    Commission, 
    Withdrawal, 
    Notification, 
    LinkClick, 
    AffiliateLink,
    Setting
} from '../models';
import { Op } from 'sequelize';

/**
 * TOTAL PURGE SCRIPT
 * This script wipes EVERYTHING from the database except:
 * - Admin Accounts (User with role 'admin')
 */

async function runTotalPurge() {
    console.log('\n💣 [DATABASE TOTAL PURGE] Starting complete database reset...');
    console.log('------------------------------------------------------------');

    try {
        // 1. Check Connection
        await db.authenticate();
        console.log('📡 Database connected.');

        // 2. Identify Database
        const dbName = (db as any).options.database || 'PostgreSQL';
        console.log(`⚠️  WARNING: You are about to wipe ALL data from: ${dbName}`);
        console.log('⚠️  ONLY ADMIN USERS WILL REMAIN.');
        
        // 3. Purge Everything (Order matters for Foreign Key constraints)
        console.log('\n🔥 Purging all collections...');
        
        const clicks = await LinkClick.destroy({ where: {}, force: true });
        console.log(`   - [x] LinkClicks: ${clicks} deleted.`);

        const notifs = await Notification.destroy({ where: {}, force: true });
        console.log(`   - [x] Notifications: ${notifs} deleted.`);

        const commissions = await Commission.destroy({ where: {}, force: true });
        console.log(`   - [x] Commissions: ${commissions} deleted.`);

        const withdrawals = await Withdrawal.destroy({ where: {}, force: true });
        console.log(`   - [x] Withdrawals: ${withdrawals} deleted.`);

        const orders = await Order.destroy({ where: {}, force: true });
        console.log(`   - [x] Orders: ${orders} deleted.`);

        const links = await AffiliateLink.destroy({ where: {}, force: true });
        console.log(`   - [x] AffiliateLinks: ${links} deleted.`);

        // NEW: Purge Products (Requested)
        const products = await Product.destroy({ where: {}, force: true });
        console.log(`   - [x] PRODUCTS: ${products} units wiped out.`);

        // NEW: Purge Settings (Requested)
        const settings = await Setting.destroy({ where: {}, force: true });
        console.log(`   - [x] SETTINGS: ${settings} configurations cleared.`);

        // 4. Purge Non-Admin Users
        console.log('\n👥 Purging non-admin users...');
        const users = await User.destroy({
            where: {
                role: { [Op.ne]: 'admin' }
            },
            force: true
        });
        console.log(`   - [x] Affiliator Users: ${users} deleted.`);

        console.log('\n------------------------------------------------------------');
        console.log('🏁 [SUCCESS] Database is now crystal clear!');
        console.log('💎 Only Admin accounts were preserved.');
        console.log('🌱 To repopulate products, run: npx ts-node src/scripts/seed.ts\n');
        
        process.exit(0);
    } catch (error: any) {
        console.error('\n❌ [ERROR] Total Purge failed:');
        console.error(error.message);
        process.exit(1);
    }
}

runTotalPurge();
