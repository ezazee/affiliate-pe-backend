import express from 'express';
import { Setting } from '../models';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const minimumWithdrawalSetting = await Setting.findOne({ where: { name: 'minimumWithdrawal' } });
        const adminWhatsAppSetting = await Setting.findOne({ where: { name: 'adminWhatsApp' } });

        const minimumWithdrawalAmount = minimumWithdrawalSetting?.value || 50000;
        const adminWhatsApp = adminWhatsAppSetting?.value || '628123456789';

        return res.json({
            minimumWithdrawal: minimumWithdrawalAmount,
            adminWhatsApp: adminWhatsApp
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, value } = req.body;

        if (!name || value === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        await Setting.upsert({ name, value });

        return res.json({ success: true, message: 'Setting updated successfully' });
    } catch (error) {
        console.error('Error updating setting:', error);
        return res.status(500).json({ error: 'Failed to update setting' });
    }
});

export default router;
