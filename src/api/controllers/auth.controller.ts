import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { JwtService } from '../auth/jwt.service';
import { RefreshService } from '../auth/refresh.service';
import { OAuthService } from '../auth/oauth.service';
import { AuthUser } from '../../shared/types/auth.types';

interface AuthRequest extends Request {
  user?: AuthUser;
}

export class AuthController {
  private userService: UserService;
  private jwtService: JwtService;
  private refreshService: RefreshService;
  private oauthService: OAuthService;

  constructor() {
    this.userService = new UserService();
    this.jwtService = new JwtService();
    this.refreshService = new RefreshService();
    this.oauthService = new OAuthService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required.' });
        return;
      }

      const existingUser = await this.userService.findUserByEmail(email);
      if (existingUser) {
        res.status(409).json({ message: 'User with that email already exists.' });
        return;
      }

      const newUser = await this.userService.createUser(email, password);
      const accessToken = this.jwtService.generateAccessToken({
        id: newUser.id,
        email: newUser.email,
        subscription_tier: newUser.subscription_tier,
      });
      const refreshToken = this.jwtService.generateRefreshToken({
        id: newUser.id,
        email: newUser.email,
        subscription_tier: newUser.subscription_tier,
      });
      this.refreshService.addRefreshToken(refreshToken);

      res.status(201).json({ message: 'User registered successfully', accessToken, refreshToken });
    } catch (error) {
      console.error('Error during registration:', error);
      res.status(500).json({ message: 'Internal server error during registration.' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ message: 'Email and password are required.' });
        return;
      }

      const user = await this.userService.findUserByEmail(email);
      if (!user || !user.encrypted_password || !(await this.userService.comparePasswords(password, user.encrypted_password))) {
        res.status(401).json({ message: 'Invalid credentials.' });
        return;
      }

      const accessToken = this.jwtService.generateAccessToken({
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
      });
      const refreshToken = this.jwtService.generateRefreshToken({
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
      });
      this.refreshService.addRefreshToken(refreshToken);

      res.status(200).json({ accessToken, refreshToken });
    } catch (error) {
      console.error('Error during login:', error);
      res.status(500).json({ message: 'Internal server error during login.' });
    }
  }

  async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

      if (token) {
        // Invalidate access token (optional, as it's short-lived)
        // For refresh token, if it's sent in body/cookie, revoke it
        const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;
        if (refreshToken) {
          this.refreshService.revokeRefreshToken(refreshToken);
        }
      }
      res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ message: 'Internal server error during logout.' });
    }
  }

  async getMe(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !req.user.id) {
        res.status(401).json({ message: 'Unauthorized.' });
        return;
      }
      const user = await this.userService.findUserById(req.user.id);
      if (!user) {
        res.status(404).json({ message: 'User not found.' });
        return;
      }
      const { encrypted_password, ...userProfile } = user;
      res.status(200).json(userProfile);
    } catch (error) {
      console.error('Error getting user info:', error);
      res.status(500).json({ message: 'Internal server error.' });
    }
  }

  async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const authUrl = this.oauthService.getGoogleAuthUrl();
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error during Google OAuth initiation:', error);
      res.status(500).json({ message: 'Internal server error during Google OAuth.' });
    }
  }

  async googleAuthCallback(req: Request, res: Response): Promise<void> {
    try {
      const { code } = req.query;
      if (!code || typeof code !== 'string') {
        res.status(400).json({ message: 'Authorization code missing.' });
        return;
      }

      const tokens = await this.oauthService.getGoogleTokens(code as string);
      const idToken = tokens.id_token;

      if (!idToken) {
        res.status(400).json({ message: 'ID token missing from Google response.' });
        return;
      }

      const payload = await this.oauthService.verifyGoogleIdToken(idToken);
      if (!payload || !payload.email) {
        res.status(400).json({ message: 'Invalid Google ID token payload.' });
        return;
      }

      let user = await this.userService.findUserByEmail(payload.email);
      if (!user) {
        // Register new user if not found
        user = await this.userService.createUser(payload.email, undefined, 'google', payload.sub);
      }

      const accessToken = this.jwtService.generateAccessToken({
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
      });
      const refreshToken = this.jwtService.generateRefreshToken({
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier,
      });
      this.refreshService.addRefreshToken(refreshToken);

      // Redirect or send tokens to frontend
      res.status(200).json({ message: 'Google OAuth successful', accessToken, refreshToken });
    } catch (error) {
      console.error('Error during Google OAuth callback:', error);
      res.status(500).json({ message: 'Internal server error during Google OAuth callback.' });
    }
  }
}