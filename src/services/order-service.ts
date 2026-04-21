import { Order, Product, User, Commission } from '../models';
import { adminNotifications, affiliatorNotifications } from './notification-service';
import { biteshipService } from './biteship';
import { EmailService } from './email-service';
import { Op } from 'sequelize';

export class OrderService {
    /**
     * Menangani proses setelah order dibayar (Paid)
     * - Update status ke DB
     * - Auto-booking Biteship
     * - Kirim notifikasi
     * - Catat komisi
     */
    static async handleOrderPaid(orderNumber: string) {
        const order = await Order.findOne({ where: { orderNumber } });
        if (!order) {
            throw new Error(`Order ${orderNumber} not found`);
        }

        if (order.status === 'paid') {
            return order; // Sudah diproses
        }

        // 1. Update status dasar
        await order.update({ 
            status: 'paid', 
            isPaymentUsed: true,
            updatedAt: new Date() 
        });



        // 2. Auto Booking Kurir
        if (order.destinationAreaId && order.courierName && order.courierService) {
            try {

                const product = await Product.findByPk(order.productId);

                const shipment = await biteshipService.createShipment({
                    orderNumber: order.orderNumber!,
                    buyerName: order.buyerName,
                    buyerPhone: order.buyerPhone,
                    shippingAddress: `${order.shippingAddress}, ${order.district || ''}, ${order.city}, ${order.province} ${order.postalCode}`,
                    destinationAreaId: order.destinationAreaId,
                    courierName: order.courierName,
                    courierService: order.courierService,
                    productName: product?.name || order.productName || 'Produk',
                    productPrice: Number(order.productPrice || 0),
                    productWeight: Number((product as any)?.weight || 500),
                    quantity: 1,
                });

                const trackingNumber = shipment.waybillId || shipment.trackingId || shipment.shipmentId;
                await order.update({
                    trackingNumber: trackingNumber,
                    biteshipShipmentId: shipment.shipmentId,
                    biteshipTrackingStatus: shipment.status || 'confirmed',
                    updatedAt: new Date(),
                });

                // KIRIM EMAIL RESI OTOMATIS KE PEMBELI
                if (order.buyerEmail) {
                    EmailService.sendTrackingEmail(
                        order.buyerEmail,
                        order.buyerName,
                        order.orderNumber || order.id,
                        trackingNumber || '',
                        order.courierName || 'Kurir'
                    ).catch((err: any) => console.error('❌ Gagal kirim email resi:', err.message));
                }


            } catch (err: any) {
                console.error('❌ Auto-booking gagal:', err.message);
            }
        }

        // 3. Notifikasi & Komisi
        try {
            const affiliator = await User.findOne({ 
                where: {
                    [Op.or]: [{ id: order.affiliatorId }, { _id: order.affiliatorId }]
                }
            });

            if (affiliator?.email) {
                await affiliatorNotifications.orderPaid(orderNumber, affiliator.email);

                // Catat Komisi jika belum ada
                const existingCommission = await Commission.findOne({ where: { orderId: order.id } });
                if (!existingCommission) {
                    const commissionRate = 0.1;
                    const commissionAmount = Math.round(Number(order.productPrice) * commissionRate);
                    const product = await Product.findByPk(order.productId);

                    await Commission.create({
                        affiliatorId: order.affiliatorId,
                        affiliateName: order.affiliateName,
                        orderId: order.id,
                        productName: product?.name || 'Product',
                        amount: commissionAmount,
                        status: 'paid',
                        date: new Date(),
                        createdAt: new Date(),
                    } as any);

                    await affiliatorNotifications.commissionEarned(
                        commissionAmount.toLocaleString('id-ID'),
                        orderNumber,
                        affiliator.email
                    );
                }
            }
        } catch (err) {
            console.error('❌ Notification/Commission error:', err);
        }

        return order;
    }
}
