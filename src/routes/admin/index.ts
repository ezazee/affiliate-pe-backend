import express from 'express';
import productRoutes from './products';
import dashboardRoutes from './dashboard';

import commissionRoutes from './commissions';
import withdrawalRoutes from './withdrawals';
import orderRoutes from './orders';
import userRoutes from './users';
import inventoryRoutes from './inventory';

import settingsRoutes from './settings';
import landingSettingsRoutes from './landing-settings';
import affiliatorRoutes from './affiliators';
import linkRoutes from './links';
import statsRoutes from './stats';
import { authenticateUser, requireAuth, requireAdmin } from '../../middleware/auth';

const router = express.Router();

// Apply global admin security: Must be logged in AND must be an admin
router.use(authenticateUser, requireAuth, requireAdmin);

router.use('/products', productRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/commissions', commissionRoutes);
router.use('/withdrawals', withdrawalRoutes);
router.use('/orders', orderRoutes);
router.use('/users', userRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/settings', settingsRoutes);
router.use('/landing-settings', landingSettingsRoutes);
router.use('/affiliators', affiliatorRoutes);
router.use('/links', linkRoutes);
router.use('/stats', statsRoutes);

export default router;
