import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import affiliatorRoutes from './routes/affiliator';
import uploadRoutes from './routes/upload';
import pushRoutes from './routes/push';
import trackingRoutes from './routes/tracking';
import shippingRoutes from './routes/shipping';
import settingsRoutes from './routes/settings';
import autocompleteRoutes from './routes/autocomplete';
import adminRoutes from './routes/admin';
import checkoutRoutes from './routes/checkout';
import paymentDetailsRoutes from './routes/payment-details';
import paymentRoutes from './routes/payment';
import placeDetailsRoutes from './routes/place-details';
import notificationRoutes from './routes/notifications';
import publicRoutes from './routes/public';
import userRoutes from './routes/user';
import webRoutes from './routes/web';
import internalSyncRoutes from './routes/internal-sync';
import { authenticateUser } from './middleware/auth';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';
import db from './config/database';


const app = express();
const port = process.env.PORT || 3001;

// Middleware Dasar
// Konfigurasi CORS: Batasi akses hanya dari alamat Frontend yang diizinkan di .env
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// WEBHOOK ROUTES: Harus di Atas express.json() agar raw body tidak berubah
app.use('/api/payment', paymentRoutes);

// Global Body Parser (Hanya untuk route di bawahnya)
app.use(express.json());

app.use((req, res, next) => {
    console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Use CDN for Swagger UI assets
const swaggerOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
    customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js'
    ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// DB Connection Check Middleware (Sequelize)
app.use(async (req, res, next) => {
    if (req.path.startsWith('/api-docs')) return next();

    try {
        await db.authenticate();
        next();
    } catch (err) {
        console.error('❌ Database connection error:', err);
        return res.status(503).json({
            error: 'Service Unavailable: Database Connection Failed',
            details: err instanceof Error ? err.message : 'Unknown Database Error'
        });
    }
});

// --- PUBLIC ROUTES (No Authentication Needed) ---
app.use('/api/auth', authRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/web', webRoutes);
app.use('/api/track-click', trackingRoutes);
app.use('/api/autocomplete-address', autocompleteRoutes);
app.use('/api/place-details', placeDetailsRoutes);
app.use('/api/internal', internalSyncRoutes);

// --- AUTHENTICATION MIDDLEWARE ---
// Populates req.user if token is present, but doesn't block access
app.use(authenticateUser);

// --- PROTECTED ROUTES (Populates req.user) ---
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/affiliator', affiliatorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payment-details', paymentDetailsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Affiliate Growth Hub Backend (PostgreSQL) is running. Documentation available at <a href="/api-docs">/api-docs</a>');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected', time: new Date() });
});

// Sync database and Start server
const startServer = async () => {
    try {
        // Only alter structure in development or when explicitly requested
        const shouldAlter = process.env.NODE_ENV !== 'production' || process.env.DB_SYNC_ALTER === 'true';
        await db.sync({ alter: shouldAlter });
        console.log(`📡 Database synced (alter: ${shouldAlter})`);

        app.listen(port, () => {
            console.log(`🚀 Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
