import Order from '../src/models/Order';
import db from '../src/config/database';

async function checkOrder() {
    try {
        const orderNumber = 'ORDER-ZR0Q3OP';
        const order = await Order.findOne({ where: { orderNumber } });
        
        if (order) {
            console.log('Order found:');
            console.log('ID:', order.id);
            console.log('Status:', order.status);
            console.log('Tracking Number:', order.trackingNumber);
            console.log('Tracking URL:', (order as any).trackingUrl);
        } else {
            console.log('Order not found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkOrder();
