import express from 'express';
import fetch from 'node-fetch'; // Ensure node-fetch is available or use native fetch if Node 18+

const router = express.Router();
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * @swagger
 * /place-details:
 *   get:
 *     summary: Ambil detail alamat dari Google Maps
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
router.get('/', async (req, res) => {
    if (!GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ error: 'Google Maps API key is not configured' });
    }

    const { placeId } = req.query;

    if (!placeId) {
        return res.status(400).json({ error: 'Missing placeId' });
    }

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId as string)}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const data: any = await response.json();

        if (response.ok && data.status === 'OK') {
            const result = data.result;
            const addressComponents: { [key: string]: string } = {
                shippingAddress: result.formatted_address || '',
                city: '',
                province: '',
                postalCode: '',
            };

            // Extract city, province, postal code from address components
            result.address_components.forEach((component: any) => {
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
        } else {
            return res.status(response.status).json({ error: data.error_message || 'Failed to fetch place details' });
        }
    } catch (error) {
        console.error('Place details API error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
