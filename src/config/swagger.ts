import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'PE Skinpro Affiliate API Docs',
            version: '1.0.0',
            description: 'Dokumentasi API untuk platform afiliasi PE Skinpro. API ini menangani autentikasi, manajemen produk, pesanan, dan komisi.',
        },
        servers: [
            {
                url: '/api',
                description: 'API Server',
            }
        ],
        components: {
            securitySchemes: {
                basicAuth: {
                    type: 'http',
                    scheme: 'basic',
                },
            },
        },
        security: [
            {
                basicAuth: [],
            },
        ],
    },
    // Look for both TS (dev) and JS (prod) files
    // Use path.join to handle relative paths correctly in different environments
    apis: [
        path.join(__dirname, '../routes/*.ts'),
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../routes/**/*.ts'),
        path.join(__dirname, '../routes/**/*.js')
    ],
};

export const specs = swaggerJsdoc(options);
