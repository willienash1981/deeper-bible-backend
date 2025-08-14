import { Router } from 'express';
import { AnalysisController } from '../controllers/analysis.controller'; // Assuming AnalysisController will be created later
import { authenticateJwt } from '../middleware/jwt.middleware';
import { authorize } from '../middleware/permissions.middleware';
import { analysisRateLimiter } from '../middleware/rate-limit.middleware';
import { validate, registerSchema } from '../middleware/validation.middleware'; // Using registerSchema as a placeholder for analysis request validation

const router = Router();
const analysisController = new AnalysisController(); // Will need to create this controller

router.post(
  '/',
  authenticateJwt,
  authorize(['generate:analysis']),
  analysisRateLimiter,
  // validate(registerSchema), // Placeholder validation schema
  (req, res) => analysisController.analyzeVerse(req, res)
);

router.get(
  '/:id',
  authenticateJwt,
  authorize(['read:analysis']),
  (req, res) => analysisController.getAnalysisById(req, res)
);

export default router;