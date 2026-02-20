import { Router } from 'express';
import analysisRoutes from './analysis';
import settingsRoutes from './settings';

const router = Router();

router.use('/analysis', analysisRoutes);
router.use('/settings', settingsRoutes);

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
