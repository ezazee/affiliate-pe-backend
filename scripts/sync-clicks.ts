import db from '../src/config/database';
import AffiliateLink from '../src/models/AffiliateLink';
import LinkClick from '../src/models/LinkClick';
import { Sequelize } from 'sequelize';

async function syncClicks() {
    try {
        console.log('🚀 Starting click sync...');
        
        const links = await AffiliateLink.findAll();
        
        for (const link of links) {
            const count = await LinkClick.count({ where: { linkId: link.id } });
            if (count !== link.clicks) {
                console.log(`Updating Link ${link.id}: ${link.clicks} -> ${count}`);
                await link.update({ clicks: count });
            }
        }
        
        console.log('✅ Click sync completed!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during click sync:', error);
        process.exit(1);
    }
}

syncClicks();
