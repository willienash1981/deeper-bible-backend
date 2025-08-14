import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthUser } from '../../shared/types/auth.types';

interface AuthRequest extends Request {
  user?: AuthUser;
}

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const user = await this.userService.findUserById(req.user.id);
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      // Exclude sensitive information like password hash
      const { encrypted_password, ...userProfile } = user;
      res.status(200).json(userProfile);
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const userId = req.user.id;
      const updates = req.body; // Assuming body contains fields to update

      // Prevent updating sensitive fields directly through this endpoint
      delete updates.id;
      delete updates.email;
      delete updates.encrypted_password;
      delete updates.oauth_provider;
      delete updates.oauth_id;
      delete updates.created_at;
      delete updates.updated_at;
      delete updates.subscription_tier; // Subscription tier should be updated via a separate billing process

      const updatedUser = await this.userService.updateUser(userId, updates);
      if (!updatedUser) {
        res.status(404).json({ message: 'User not found or no changes applied' });
        return;
      }
      const { encrypted_password, ...userProfile } = updatedUser;
      res.status(200).json(userProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async deleteAccount(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const userId = req.user.id;
      const deleted = await this.userService.deleteUser(userId);
      if (deleted) {
        res.status(204).send(); // No content
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error deleting user account:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
      }
      await this.userService.requestPasswordReset(email);
      res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
      console.error('Error requesting password reset:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        res.status(400).json({ message: 'Token and new password are required' });
        return;
      }
      const success = await this.userService.resetPassword(token, newPassword);
      if (success) {
        res.status(200).json({ message: 'Password has been reset successfully.' });
      } else {
        res.status(400).json({ message: 'Invalid or expired reset token.' });
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}