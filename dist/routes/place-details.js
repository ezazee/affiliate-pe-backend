"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const node_fetch_1 = __importDefault(require("node-fetch")); // Ensure node-fetch is available or use native fetch if Node 18+
const router = express_1.default.Router();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
/**
 * @swagger
 * /place-details:
 *   get:
 *     summary: Get address details from Google Maps
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: placeId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Address details
 *       400:
 *         description: Missing placeId
 *       500:
 *         description: Server error or missing API key
 */
// GET /api/place-details
router.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ error: 'Google Maps API key is not configured' });
    }
    const { placeId } = req.query;
    if (!placeId) {
        return res.status(400).json({ error: 'Missing placeId' });
    }
    try {
        const response = yield (0, node_fetch_1.default)(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&key=${GOOGLE_MAPS_API_KEY}`);
        const data = yield response.json();
        if (response.ok && data.status === 'OK') {
            const result = data.result;
            const addressComponents = {
                shippingAddress: result.formatted_address || '',
                city: '',
                province: '',
                postalCode: '',
            };
            // Extract city, province, postal code from address components
            result.address_components.forEach((component) => {
                if (component.types.includes('locality')) {
                    addressComponents.city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                    addressComponents.province = component.long_name;
                }
                if (component.types.includes('postal_code')) {
                    addressComponents.postalCode = component.long_name;
                }
            });
            return res.json({
                shippingAddress: addressComponents.shippingAddress,
                city: addressComponents.city,
                province: addressComponents.province,
                postalCode: addressComponents.postalCode,
                latitude: result.geometry.location.lat,
                longitude: result.geometry.location.lng,
            });
        }
        else {
            return res.status(response.status).json({ error: data.error_message || 'Failed to fetch place details' });
        }
    }
    catch (error) {
        console.error('Place details API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}));
exports.default = router;
