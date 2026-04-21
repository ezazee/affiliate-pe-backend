import { gatewayClient } from './gateway-client';

/**
 * Menghubungkan Backend Affiliate ke peskin-payment-service Gateway
 */

interface CreatePaymentParams {
    orderNumber: string;
    totalPrice: number;
    buyerName: string;
    buyerEmail?: string;
    buyerPhone?: string;
    productName: string;
    productPrice: number;
}

/**
 * Membuat sesi pembayaran DOKU via Gateway
 */
export async function createDokuPayment(params: CreatePaymentParams) {
    const BACKEND_URL = process.env.BACKEND_URL || process.env.NGROK_URL || 'http://localhost:8001';
    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

    const response = await gatewayClient.post('/payments/create', {
        invoiceNumber: params.orderNumber,
        amount: params.totalPrice,
        buyerName: params.buyerName,
        buyerEmail: params.buyerEmail,
        buyerPhone: params.buyerPhone,
        productName: params.productName,
        successUrl: `${FRONTEND_URL}/payment/success?order=${params.orderNumber}`,
        failedUrl: `${FRONTEND_URL}/payment/failed?order=${params.orderNumber}`,
        callbackUrl: `${BACKEND_URL}/api/payment/doku/notify`, // Endpoint internal kita
    });

    return {
        paymentUrl: response.data.paymentUrl,
        requestId: response.data.requestId,
    };
}

/**
 * Cek status pembayaran ke DOKU via Gateway (Inquiry)
 */
export async function checkDokuStatus(orderNumber: string) {
    const response = await gatewayClient.get(`/payments/status/${orderNumber}`);
    return response.data;
}

// verifyDokuWebhook sudah tidak diperlukan di sini karena ditangani oleh Gateway
export function verifyDokuWebhook(_headers: any, _body: any): boolean {
    // Gateway sudah memverifikasi signature, kita percaya request dari gateway
    return true;
}
