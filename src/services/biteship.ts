import { gatewayClient } from './gateway-client';

/**
 * Menghubungkan Backend Affiliate ke peskin-payment-service untuk Shipping
 */

export interface BiteshipArea {
    id: string;
    name: string;
    administrative_division_level_1_name: string;
    administrative_division_level_2_name: string;
    administrative_division_level_3_name: string;
    postal_code: number;
}

export interface BiteshipRateItem {
    name: string;
    description: string;
    value: number;
    weight: number;
    quantity: number;
    length?: number;
    width?: number;
    height?: number;
}

export const biteshipService = {
    /**
     * Mencari Area ID via Gateway
     */
    async searchAreas(query: string) {
        const response = await gatewayClient.get('/shipping/areas', {
            params: { input: query }
        });
        return response.data as BiteshipArea[];
    },

    /**
     * Mendapatkan tarif via Gateway
     */
    async getRates(destinationAreaId: string, items: BiteshipRateItem[], destinationLat?: number, destinationLng?: number) {
        const response = await gatewayClient.post('/shipping/rates', {
            destinationAreaId,
            items,
            destinationLat,
            destinationLng
        });
        return response.data.rates;
    },

    /**
     * Membuat pengiriman via Gateway
     */
    async createShipment(orderData: {
        orderNumber: string;
        buyerName: string;
        buyerPhone: string;
        shippingAddress: string;
        destinationAreaId: string;
        destinationLat?: number;
        destinationLng?: number;
        buyerPostalCode?: string;
        buyerEmail?: string;
        courierName: string;
        courierService: string;
        productName: string;
        productPrice: number;
        productWeight: number;
        productLength?: number;
        productWidth?: number;
        productHeight?: number;
        quantity?: number;
        orderNote?: string;
    }) {
        const response = await gatewayClient.post('/shipping/create', {
            ...orderData
        });

        return {
            shipmentId: response.data.shipmentId,
            trackingId: response.data.trackingId,
            waybillId: response.data.waybillId,
            trackingUrl: response.data.trackingUrl,
            status: response.data.status,
        };
    },
    
    /**
     * Mendapatkan status pengiriman via Gateway
     */
    async getShipmentStatus(shipmentId: string) {
        const response = await gatewayClient.get(`/shipping/status/${shipmentId}`);
        return response.data;
    }
};
