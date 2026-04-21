import express from 'express';
import { verifyDokuWebhook } from '../services/doku';
import { OrderService } from '../services/order-service';

import { verifyInternalWebhook } from '../middleware/webhook-auth';

const router = express.Router();

/**
 * POST /api/payment/doku/notify
 * Webhook dari DOKU saat pembayaran berhasil / gagal
 * DOKU mengirimkan notifikasi ini secara server-to-server
 * SECURED: Memerlukan internal signature dari payment-service
 */
router.post('/doku/notify', verifyInternalWebhook, async (req, res) => {
  const { event, invoiceNumber, status, trackingId, shipmentId } = req.body;

  console.log(`📩 [Gateway Callback] Event: ${event}, Invoice: ${invoiceNumber}, Status: ${status}`);

  if (!invoiceNumber) {
    return res.status(400).json({ error: 'invoice_number tidak ditemukan' });
  }

  try {
    // 1. Handle Payment Success
    if (event === 'payment.success' && status === 'SUCCESS') {
      await OrderService.handleOrderPaid(invoiceNumber);
      return res.status(200).json({ message: 'Payment processed' });
    }

    // 2. Handle Shipping Update
    if (event === 'shipping.update') {
      const { Order } = require('../models');
      const order = await Order.findOne({ where: { orderNumber: invoiceNumber } });

      if (order) {
        // Mapping status Biteship ke internal
        let internalStatus = order.status;
        switch (status) {
          case 'picked':
          case 'in_transit': internalStatus = 'shipping'; break;
          case 'delivered':  internalStatus = 'delivered'; break;
          case 'cancelled':
          case 'returned':   internalStatus = 'cancelled'; break;
        }

        await order.update({
          status: internalStatus,
          biteshipTrackingStatus: status,
          trackingNumber: trackingId || order.trackingNumber,
          biteshipShipmentId: shipmentId || order.biteshipShipmentId
        });
        console.log(`🚚 [Shipping Update] Order ${invoiceNumber} updated to ${internalStatus} (${status})`);
      }
      return res.status(200).json({ message: 'Shipping updated' });
    }

    return res.status(200).json({ message: 'Event ignored' });
  } catch (error: any) {
    console.error('❌ Gagal memproses callback gateway:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
