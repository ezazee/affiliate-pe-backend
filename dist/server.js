"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const products_1 = __importDefault(require("./routes/products"));
const orders_1 = __importDefault(require("./routes/orders"));
const affiliator_1 = __importDefault(require("./routes/affiliator"));
const upload_1 = __importDefault(require("./routes/upload"));
const push_1 = __importDefault(require("./routes/push"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const shipping_1 = __importDefault(require("./routes/shipping"));
const settings_1 = __importDefault(require("./routes/settings"));
const autocomplete_1 = __importDefault(require("./routes/autocomplete"));
const admin_1 = __importDefault(require("./routes/admin"));
const checkout_1 = __importDefault(require("./routes/checkout"));
const payment_details_1 = __importDefault(require("./routes/payment-details"));
const place_details_1 = __importDefault(require("./routes/place-details"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const public_1 = __importDefault(require("./routes/public"));
const user_1 = __importDefault(require("./routes/user"));
const web_1 = __importDefault(require("./routes/web"));
const auth_2 = require("./middleware/auth");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = require("./config/swagger");
const dotenv_1 = __importDefault(require("dotenv"));
// Load env vars
dotenv_1.default.config(); // Load from .env in current directory by default
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.specs));
app.use(auth_2.authenticateUser); // Global auth middleware (populates req.user if token present)
// Routes
// Mount auth routes at /api/auth to match Next.js structure
app.use('/api/auth', auth_1.default);
app.use('/api/products', products_1.default);
app.use('/api/orders', orders_1.default);
app.use('/api/affiliator', affiliator_1.default);
app.use('/api/upload', upload_1.default);
app.use('/api/push', push_1.default);
app.use('/api/track-click', tracking_1.default);
app.use('/api/calculate-shipping', shipping_1.default);
app.use('/api/settings', settings_1.default);
app.use('/api/autocomplete-address', autocomplete_1.default);
// New Routes
app.use('/api/checkout', checkout_1.default);
app.use('/api/payment-details', payment_details_1.default);
app.use('/api/place-details', place_details_1.default);
app.use('/api/place-details', place_details_1.default);
app.use('/api/notifications', notifications_1.default);
app.use('/api/public', public_1.default);
app.use('/api/user', user_1.default);
app.use('/api/web', web_1.default); // Mount web routes for legacy compatibility
app.use('/api/admin', admin_1.default);
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
    console.log(`Backend server running on http://localhost:${port}`);
});
