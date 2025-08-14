import { Router } from 'express';
import { UserController } from '../controllers/user.controller'; // Assuming UserController will be created later
import { authenticateJwt } from '../middleware/jwt.middleware'; // Assuming JWT authentication middleware

const router = Router();
const userController = new UserController(); // Will need to create this controller

router.get('/profile', authenticateJwt, (req, res) => userController.getProfile(req, res));
router.put('/profile', authenticateJwt, (req, res) => userController.updateProfile(req, res));
router.delete('/profile', authenticateJwt, (req, res) => userController.deleteAccount(req, res));
router.post('/password/reset-request', (req, res) => userController.requestPasswordReset(req, res));
router.post('/password/reset', (req, res) => userController.resetPassword(req, res));

export default router;