
import Commission from '../src/models/Commission.ts';
import db from '../src/config/database.ts';

async function checkCommissions() {
  try {
    const commissions = await Commission.findAll({
      where: {
        isPartial: false
      },
      limit: 10
    });
    
    console.log('--- COMMISSION DATA CHECK ---');
    commissions.forEach(c => {
      console.log(`Order: ${c.orderId} | Status: ${c.status} | Amount: ${c.amount} | Used: ${c.usedAmount}`);
    });
    console.log('-----------------------------');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkCommissions();
