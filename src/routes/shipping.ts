import express from 'express';
import clientPromise from '../config/database';

const router = express.Router();
const MAPBOX_API_KEY = process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_API_KEY || 'pk.eyJ1IjoibXJ6c2FhIiwiYSI6ImNtaW1vM2ZpZTFvNW8zZG9jcmtwaXN0N2IifQ.Fyv7u5HxDjH6SInvE9gHqw';

console.log('Shipping Route Loaded. Mapbox Key Configured:', !!MAPBOX_API_KEY);

// A simple function to calculate shipping cost based on distance tiers
const calculateCost = (distanceInKm: number, rates: any): { cost: number; rateApplied: number; policyDescription: string } => {
    const { short_rate, medium_rate, long_rate, long_flat_rate } = rates;
    let cost = 0;
    let rateApplied = 0;
    let policyDescription = '';

    if (distanceInKm < 20) {
        cost = distanceInKm * short_rate;
        rateApplied = short_rate;
        policyDescription = `Berdasarkan jarak kurang dari 20 km (Dalam kota / dekat), biaya Rp ${short_rate.toLocaleString('id-ID')} per km diterapkan.`;
    } else if (distanceInKm >= 20 && distanceInKm <= 150) {
        cost = distanceInKm * medium_rate;
        rateApplied = medium_rate;
        policyDescription = `Berdasarkan jarak 20-150 km (Antar kota / jarak menengah), biaya Rp ${medium_rate.toLocaleString('id-ID')} per km diterapkan.`;
    } else {
        // Note: Original logic: flat + (dist * rate). 
        cost = long_flat_rate + (distanceInKm * long_rate);
        rateApplied = long_rate;
        policyDescription = `Berdasarkan jarak lebih dari 150 km (Jauh / lintas pulau), biaya flat Rp ${long_flat_rate.toLocaleString('id-ID')} ditambah Rp ${long_rate.toLocaleString('id-ID')} per km diterapkan.`;
    }
    return { cost, rateApplied, policyDescription };
};

// Geocode an address using Mapbox
const geocodeAddress = async (address: string): Promise<{ lon: number; lat: number }> => {
    const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_API_KEY}&limit=1&country=ID`);
    const data = await response.json();
    if (!data.features || data.features.length === 0) {
        throw new Error('Address not found.');
    }
    const [lon, lat] = data.features[0].center;
    return { lon, lat };
};

interface ShippingSettings {
    warehouseAddress?: string;
    short_rate?: number;
    medium_rate?: number;
    long_rate?: number;
    long_flat_rate?: number;
}

router.post('/', async (req, res) => {
    if (!MAPBOX_API_KEY) {
        return res.status(500).json({ error: 'Mapbox API key is not configured' });
    }

    try {
        const { shippingAddress, city, province, postalCode } = req.body;
        const fullAddress = `${shippingAddress}, ${city}, ${province}, ${postalCode}`;

        // Fetch settings
        const client = await clientPromise;
        const db = client.db();
        const settingsCursor = db.collection('settings').find({
            name: { $in: ['warehouseAddress', 'short_rate', 'medium_rate', 'long_rate', 'long_flat_rate'] }
        });
        const settingsArray = await settingsCursor.toArray();
        const settings = settingsArray.reduce<any>((acc, setting) => {
            acc[setting.name] = setting.value;
            return acc;
        }, {});

        const { warehouseAddress, short_rate, medium_rate, long_rate, long_flat_rate } = settings;

        // Validate settings
        const missingSettings = [];
        if (!warehouseAddress) missingSettings.push('Warehouse Address');
        if (short_rate === undefined) missingSettings.push('Short Distance Rate');
        if (medium_rate === undefined) missingSettings.push('Medium Distance Rate');
        if (long_rate === undefined) missingSettings.push('Long Distance Rate');
        if (long_flat_rate === undefined) missingSettings.push('Long Distance Flat Rate');

        if (missingSettings.length > 0) {
            const error_message = `The following required settings are missing: ${missingSettings.join(', ')}. Please configure them in the admin settings.`;
            return res.status(500).json({ error: error_message });
        }

        let originCoords;
        let destinationCoords;

        try {
            originCoords = await geocodeAddress(warehouseAddress);
        } catch (e) {
            return res.status(400).json({ error: `The configured warehouse address ('${warehouseAddress}') could not be found.` });
        }

        try {
            destinationCoords = await geocodeAddress(fullAddress);
        } catch (e) {
            return res.status(400).json({ error: `The shipping destination address ('${fullAddress}') could not be found.` });
        }

        // Mapbox Directions API
        const directionsResponse = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords.lon},${originCoords.lat};${destinationCoords.lon},${destinationCoords.lat}?access_token=${MAPBOX_API_KEY}`);

        if (!directionsResponse.ok) {
            return res.status(502).json({ error: `Mapbox Directions API request failed.` });
        }

        const directionsData = await directionsResponse.json();

        if (directionsData.code !== 'Ok' || !directionsData.routes || directionsData.routes.length === 0) {
            return res.status(400).json({ error: "A shipping route could not be calculated." });
        }

        const distanceInMeters = directionsData.routes[0].distance;
        const distanceInKm = distanceInMeters / 1000;

        const { cost: shippingCost, policyDescription } = calculateCost(distanceInKm, { short_rate, medium_rate, long_rate, long_flat_rate });

        return res.json({
            shippingCost: Math.round(shippingCost),
            distanceInKm: Math.round(distanceInKm * 100) / 100,
            appliedRateDetails: policyDescription,
        });

    } catch (error: any) {
        console.error('Shipping calc error', error);
        return res.status(500).json({ error: error.message || 'Failed to calculate shipping cost' });
    }
});

export default router;
