import { Router } from 'express';
import authRoutes from './authRoutes.js';
import healthRoutes from './healthRoutes.js';
import itemRoutes from './itemRoutes.js';
import statsRoutes from './statsRoutes.js';
import uploadRoutes from './uploadRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/items', itemRoutes);
router.use('/stats', statsRoutes);
router.use('/upload', uploadRoutes);

export default router;
