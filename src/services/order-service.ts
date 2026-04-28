import { Order, Product, User, Commission, BundleItem, StockLog } from '../models';
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
        const paidActivity = {
            status: 'paid',
            timestamp: new Date(),
            note: 'Pembayaran telah dikonfirmasi. Pesanan sedang diproses.'
        };

        await order.update({ 
            status: 'paid', 
            isPaymentUsed: true,
            updatedAt: new Date(),
            activityLog: [...(order.activityLog || []), paidActivity]
        });

        // 1.5 Deduct Stock & Sync to Peskinext
        try {
            const product = await Product.findByPk(order.productId, {
                include: [{ model: BundleItem, as: 'bundleItems', include: [{ model: Product, as: 'componentProduct' }] }]
            });

            if (product) {
                const itemsToDeduct: { sku: string; qty: number; productId: string }[] = [];

                if (product.type === 'bundle' && (product as any).bundleItems?.length > 0) {
                    // It's a bundle, deduct components
                    (product as any).bundleItems.forEach((bi: any) => {
                        itemsToDeduct.push({
                            sku: bi.componentProduct.sku,
                            qty: bi.quantity * (order.quantity || 1),
                            productId: bi.componentProductId
                        });
                    });
                } else {
                    // Single product
                    itemsToDeduct.push({
                        sku: product.sku,
                        qty: order.quantity || 1,
                        productId: product.id
                    });
                }

                // Process each item
                for (const item of itemsToDeduct) {
                    const compProduct = await Product.findByPk(item.productId);
                    if (compProduct) {
                        // Deduct in Affiliate DB
                        const oldStock = compProduct.stock;
                        const newStock = Math.max(0, oldStock - item.qty);
                        await compProduct.update({ stock: newStock });
                        
                        // Record Log for Audit Trail
                        await StockLog.create({
                            productId: compProduct.id,
                            type: 'sale',
                            quantity: -item.qty,
                            previousStock: oldStock,
                            newStock: newStock,
                            note: `Penjualan Order #${order.orderNumber}`,
                            referenceId: order.orderNumber,
                            picName: 'Sistem',
                            picId: 'system'
                        });

                        console.log(`[STOCK] Deducted stock for ${compProduct.sku}: ${oldStock} -> ${newStock}`);

                        // Sync back to Peskinext
                        const peskinextUrl = process.env.PESKINEXT_BACKEND_URL;
                        const syncKey = process.env.MASTER_SYNC_KEY;

                        if (peskinextUrl && syncKey) {
                            const fetch = require('node-fetch');
                            const syncResponse = await fetch(`${peskinextUrl}/api/v1/external/inventory/sync`, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'x-sync-key': syncKey
                                },
                                body: JSON.stringify({
                                    items: [{ sku: item.sku, qty: item.qty }],
                                    channel: 'affiliate'
                                })
                            });
                            
                            if (syncResponse.ok) {
                                console.log(`✅ [SYNC] Successfully reported sale to Peskinext for SKU ${item.sku}`);
                            } else {
                                const errorData = await syncResponse.json();
                                console.error(`❌ [SYNC] Failed to report sale to Peskinext:`, errorData);
                            }
                        }
                    }
                }
            }
        } catch (stockErr: any) {
            console.error(`[Order Service] Error saat memotong stock atau sync ke Peskinext untuk order ${order.orderNumber}:`, stockErr.message);
        }



        // 2. Auto Booking Kurir
        if (order.destinationAreaId && order.courierName && order.courierService) {
            try {
                // PENTING: Gunakan getDataValue() untuk kolom 'length' karena
                // 'length' adalah reserved property di JavaScript (panjang string/array).
                // Jika kita akses product.length, kita dapat built-in JS length, bukan kolom DB.
                const product = await Product.findByPk(order.productId);

                const dimLength = product ? Number(product.getDataValue('length') || 1) : 1;
                const dimWidth  = product ? Number(product.getDataValue('width')  || 1) : 1;
                const dimHeight = product ? Number(product.getDataValue('height') || 1) : 1;
                const dimWeight = product ? Number(product.getDataValue('weight') || 100) : 100;

                // Hotfix: Normalisasi nama kurir dan layanan sebelum dikirim ke gateway
                const courierMap: Record<string, string> = {
                    'j&t': 'jnt', 'jnt': 'jnt', 'jne': 'jne', 'sicepat': 'sicepat',
                    'anteraja': 'anteraja', 'tiki': 'tiki'
                };
                
                const cleanCourierName = courierMap[order.courierName.toLowerCase().replace(/[\s-&]/g, '')] || order.courierName.toLowerCase().replace(/[\s-&]/g, '');
                
                // Khusus J&T: "reg" atau "reguler" dipetakan ke "EZ"
                let cleanService = order.courierService.toLowerCase().trim();
                if (cleanCourierName === 'jnt' && (cleanService === 'reg' || cleanService === 'reguler' || cleanService === 'standard')) {
                    cleanService = 'ez';
                }

                const shipment = await biteshipService.createShipment({
                    orderNumber: order.orderNumber!,
                    buyerName: order.buyerName,
                    buyerPhone: order.buyerPhone,
                    shippingAddress: `${order.shippingAddress}, ${order.district || ''}, ${order.city}, ${order.province} ${order.postalCode}`,
                    destinationAreaId: order.destinationAreaId,
                    destinationLat: order.destinationLat ? Number(order.destinationLat) : undefined,
                    destinationLng: order.destinationLng ? Number(order.destinationLng) : undefined,
                    buyerPostalCode: order.postalCode || undefined,
                    buyerEmail: order.buyerEmail || undefined,
                    courierName: cleanCourierName,
                    courierService: cleanService,
                    productName: product?.name || order.productName || 'Produk',
                    productPrice: Number(order.productPrice || 0),
                    productWeight: dimWeight,
                    productLength: dimLength,
                    productWidth:  dimWidth,
                    productHeight: dimHeight,
                    quantity: order.quantity || 1,
                    orderNote: order.orderNote || undefined,
                });

                const trackingNumber = shipment.waybillId || shipment.trackingId || shipment.shipmentId;
                
                const shippingActivity = {
                    status: 'processing', // Gunakan status 'processing' supaya judulnya "Menunggu Penjemputan"
                    timestamp: new Date(),
                    note: `Kurir ${order.courierName} (${order.courierService}) berhasil dibooking. Resi: ${trackingNumber}. Menunggu kurir melakukan penjemputan (Pickup).`
                };

                await order.update({
                    trackingNumber: trackingNumber,
                    trackingUrl: shipment.trackingUrl,
                    biteshipShipmentId: shipment.shipmentId,
                    biteshipTrackingStatus: shipment.status || 'confirmed',
                    status: 'paid', // Status tetap 'paid' sampai kurir benar-benar menjemput (pickup)
                    updatedAt: new Date(),
                    activityLog: [...(order.activityLog || []), shippingActivity]
                });

                // KIRIM EMAIL RESI OTOMATIS KE PEMBELI
                if (order.buyerEmail) {
                    EmailService.sendTrackingEmail(
                        order.buyerEmail,
                        order.buyerName,
                        order.orderNumber || order.id,
                        trackingNumber || '',
                        order.courierName || 'Kurir',
                        shipment.trackingUrl
                    ).catch((err: any) => console.error('❌ Gagal kirim email resi:', err.message));
                }


            } catch (err: any) {
                console.error(`\n🚨 [AFFILIATE BACKEND - AUTO BOOKING ERROR]`);
                console.error(`Order Number: ${order.orderNumber}`);
                console.error(`Penyebab: ${err.message}\n`);
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
                    const totalProductPrice = Number(order.productPrice || 0) * (order.quantity || 1);
                    const commissionAmount = Math.round(totalProductPrice * commissionRate);
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
            console.error(`[Order Service] Gagal memproses notifikasi/komisi untuk order ${order.orderNumber}:`, err);
        }

        return order;
    }
}
