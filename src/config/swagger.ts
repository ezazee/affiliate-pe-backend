import swaggerJsdoc from 'swagger-jsdoc';

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
                url: 'https://affiliate-pe-backend.vercel.app/api',
                description: 'Production Server',
            },
            {
                url: 'http://localhost:3001/api',
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/routes/**/*.ts'], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
