import express from 'express';
import { biteshipService } from '../services/biteship';
import { Order, Product } from '../models';

const router = express.Router();

/**
 * GET /api/v1/shipping/areas
 * Mencari Area ID untuk autocomplete lokasi di frontend
 */
router.get('/areas', async (req, res) => {
  try {
    const { input } = req.query;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input pencarian diperlukan.' });
    }

    const areas = await biteshipService.searchAreas(input);
    res.json(areas);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/shipping/rates
 * Mendapatkan daftar harga kurir berdasarkan Area ID
 */
router.post('/rates', async (req, res) => {
  try {
    const { 
      destination_area_id, 
      productId, 
      quantity = 1, 
      province, 
      city, 
      district,
      destinationLat,
      destinationLng
    } = req.body;

    let finalAreaId = destination_area_id;

    // Resolve Area ID from text if not provided (for manual forms)
    if (!finalAreaId && district && city) {
      const searchQuery = `${district}, ${city}`;
      const areas = await biteshipService.searchAreas(searchQuery);
      if (areas && areas.length > 0) {
        // Find the best match (level 3 name should match district)
        const match = areas.find((a: any) => 
          a.administrative_division_level_3_name.toLowerCase().includes(district.toLowerCase())
        ) || areas[0];
        finalAreaId = match.id;
      }
    }

    if (!finalAreaId || !productId) {
      return res.status(400).json({ error: 'Data lokasi tidak lengkap (Pilih kecamatan yang benar).' });
    }

    // Ambil data produk untuk mendapatkan berat
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }

    const items = [
      {
        name: product.name,
        description: product.description || '',
        value: Number(product.price),
        weight: Number(product.weight || 100),
        length: Number(product.length || 1),
        width: Number(product.width || 1),
        height: Number(product.height || 1),
        quantity: quantity
      }
    ];

    const pricing = await biteshipService.getRates(finalAreaId, items, destinationLat, destinationLng);
    
    res.json({ rates: pricing, resolvedAreaId: finalAreaId });
  } catch (error: any) {
    console.error(`[Shipping Service] Error fetching rates:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/shipping/webhook
 * Menerima update status otomatis dari Biteship
 */
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;
    
    // Biteship menyertakan order_id atau shipment_id di payload mereka
    // Bergantung pada apakah kita menggunakan sistem Biteship Order atau Shipment
    const { id: biteshipShipmentId, status, tracking_id } = payload;

    if (!biteshipShipmentId) {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    // Cari order berdasarkan biteshipShipmentId
    const order = await Order.findOne({
      where: { biteshipShipmentId: biteshipShipmentId }
    });

    if (!order) {
      console.warn(`Webhook received for unknown shipment ID: ${biteshipShipmentId}`);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mapping status Biteship ke status internal kita
    // Status potensial Biteship: picked, in_transit, delivered, returned, cancelled
    let internalStatus = order.status;

    switch (status) {
      case 'picked':
      case 'in_transit':
        internalStatus = 'shipping';
        break;
      case 'delivered':
        internalStatus = 'delivered';
        break;
      case 'cancelled':
      case 'returned':
        internalStatus = 'cancelled';
        break;
    }

    // Update activity log
    const statusNoteMap: Record<string, string> = {
      'picked': 'Kurir sudah menjemput paket (Picked Up).',
      'in_transit': 'Paket sedang dalam perjalanan oleh kurir.',
      'delivered': 'Pesanan telah diterima oleh pelanggan (Delivered).',
      'cancelled': 'Pengiriman dibatalkan.',
      'returned': 'Paket dikembalikan ke pengirim.'
    };

    const newActivity = {
      status: internalStatus,
      timestamp: new Date(),
      note: statusNoteMap[status] || `Update pengiriman dari kurir: ${status}`
    };

    // Update order
    await order.update({
      status: internalStatus,
      biteshipTrackingStatus: status,
      trackingNumber: tracking_id || order.trackingNumber,
      activityLog: [...(order.activityLog || []), newActivity]
    });

    console.log(`Order ${order.orderNumber} updated via webhook to ${internalStatus} (${status})`);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
