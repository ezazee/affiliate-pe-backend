import axios from 'axios';

const GATEWAY_URL = process.env.PAYMENT_GATEWAY_URL || 'http://localhost:8005';
const GATEWAY_KEY = process.env.PAYMENT_GATEWAY_KEY;

/**
 * Centralized client untuk berkomunikasi dengan peskin-payment-service
 */
export const gatewayClient = axios.create({
    baseURL: GATEWAY_URL,
    headers: {
        'X-App-Key': GATEWAY_KEY,
        'Content-Type': 'application/json',
    },
});

/*
// Debug logger
gatewayClient.interceptors.request.use(config => {
    console.log(`📡 [Gateway Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
});
*/

gatewayClient.interceptors.response.use(
    response => response,
    error => {
        const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
        console.error(`❌ [Gateway Error] ${error.config?.url}:`, detail);
        return Promise.reject(error);
    }
);
