import express from 'express';
import productRoutes from './products';
import dashboardRoutes from './dashboard';

import commissionRoutes from './commissions';
import withdrawalRoutes from './withdrawals';
import orderRoutes from './orders';
import userRoutes from './users';

import settingsRoutes from './settings';
import landingSettingsRoutes from './landing-settings';
import affiliatorRoutes from './affiliators';
import linkRoutes from './links';
import cleanupRoutes from './cleanup';
import purgeRoutes from './purge';
import statsRoutes from './stats';

const router = express.Router();

router.use('/products', productRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/commissions', commissionRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);
router.use('/landing-settings', landingSettingsRoutes);
router.use('/affiliators', affiliatorRoutes);
router.use('/links', linkRoutes);
router.use('/cleanup', cleanupRoutes);
router.use('/purge', purgeRoutes);
router.use('/stats', statsRoutes);

export default router;
