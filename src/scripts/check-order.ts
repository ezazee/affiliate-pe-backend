import db from '../config/database';
import { Order } from '../models';

async function checkOrder() {
    const order = await Order.findOne({ where: { orderNumber: 'ORDER-ZCPM43P' } });
    console.log('Order Data:', JSON.stringify(order, null, 2));
    process.exit(0);
}

checkOrder();
