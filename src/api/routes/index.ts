import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import analysisRoutes from './analysis.routes';
import symbolsRoutes from './symbols.routes';
import analyticsRoutes from './analytics.routes';
import docsRoutes from './docs.routes';
import booksRoutes from './books.routes';
import reportsRoutes from './reports.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/analysis', analysisRoutes);
router.use('/symbols', symbolsRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/docs', docsRoutes);
router.use('/books', booksRoutes);
router.use('/reports', reportsRoutes);

export default router;