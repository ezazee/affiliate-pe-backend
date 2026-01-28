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
import placeDetailsRoutes from './routes/place-details';
import notificationRoutes from './routes/notifications';
import publicRoutes from './routes/public';
import userRoutes from './routes/user';
import webRoutes from './routes/web';
import { authenticateUser } from './middleware/auth';
import swaggerUi from 'swagger-ui-express';
import { specs } from './config/swagger';
import dotenv from 'dotenv';

// Load env vars
dotenv.config(); // Load from .env in current directory by default

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
// Use CDN for Swagger UI assets to avoid static file serving issues in Vercel
const swaggerOptions = {
    customCssUrl: 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui.min.css',
    customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-bundle.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.0.0/swagger-ui-standalone-preset.js'
    ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerOptions));

// DB Connection Check Middleware
import clientPromise, { connectionError } from './config/database';
app.use(async (req, res, next) => {
    // Skip for Swagger assets to ensure docs always load
    if (req.path.startsWith('/api-docs')) return next();

    try {
        const client = await clientPromise;
        if (!client) {
            return res.status(503).json({
                error: 'Service Unavailable: Database Connection Failed',
                details: connectionError ? connectionError.message : 'Unknown Connection Error'
            });
        }
        next();
    } catch (err) {
        // Should match the catch in database.ts, but just in case
        return res.status(503).json({
            error: 'Service Unavailable: Database Error',
            details: err instanceof Error ? err.message : String(err)
        });
    }
});

app.use(authenticateUser); // Global auth middleware (populates req.user if token present)

// Routes
// Mount auth routes at /api/auth to match Next.js structure
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/affiliator', affiliatorRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/track-click', trackingRoutes);
app.use('/api/calculate-shipping', shippingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/autocomplete-address', autocompleteRoutes);
// New Routes
app.use('/api/checkout', checkoutRoutes);
app.use('/api/payment-details', paymentDetailsRoutes);
app.use('/api/place-details', placeDetailsRoutes);
app.use('/api/place-details', placeDetailsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/user', userRoutes);
app.use('/api/web', webRoutes); // Mount web routes for legacy compatibility
app.use('/api/admin', adminRoutes);



// Root route
app.get('/', (req, res) => {
    res.send('Affiliate Growth Hub Backend is running. Documentation available at <a href="/api-docs">/api-docs</a>');
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date() });
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);

    // Log database connection info for debugging
    const dbUri = process.env.MONGODB_URI || 'undefined';
    const maskedUri = dbUri.replace(/:([^:@]+)@/, ':****@');
    console.log(`Connecting to MongoDB: ${maskedUri}`);
});
