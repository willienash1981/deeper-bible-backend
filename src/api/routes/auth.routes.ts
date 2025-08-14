import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller'; // Assuming AuthController will be created later

const router = Router();
const authController = new AuthController(); // Will need to create this controller

router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/logout', (req, res) => authController.logout(req, res));
router.get('/me', (req, res) => authController.getMe(req, res)); // Example protected route

// OAuth specific routes (placeholders for now)
router.get('/oauth/google', (req, res) => authController.googleAuth(req, res));
router.get('/oauth/google/callback', (req, res) => authController.googleAuthCallback(req, res));

export default router;