import { Request, Response, NextFunction } from 'express';
import { JwtService } from '../auth/jwt.service';
import { RefreshService } from '../auth/refresh.service';
import { AuthUser } from '../../shared/types/auth.types';

interface AuthRequest extends Request {
  user?: AuthUser;
}

const jwtService = new JwtService();
const refreshService = new RefreshService();

export const authenticateJwt = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer ACCESS_TOKEN

  if (token == null) {
    return res.sendStatus(401); // No token provided
  }

  try {
    const user = jwtService.verifyAccessToken(token);
    req.user = user;
    next();
  } catch (error: any) {
    if (error.message === 'Invalid or expired access token.') {
      // Attempt to refresh token if it's an expired access token
      const refreshToken = req.cookies?.refreshToken; // Assuming refresh token is in http-only cookie

      if (!refreshToken) {
        return res.sendStatus(401); // No refresh token
      }

      try {
        const userPayload = jwtService.verifyRefreshToken(refreshToken);
        if (!refreshService.hasRefreshToken(refreshToken)) {
          // Refresh token not found in store (e.g., revoked or not issued by us)
          return res.sendStatus(403);
        }

        // Generate new access token
        const newAccessToken = jwtService.generateAccessToken({
          id: userPayload.id,
          email: userPayload.email,
          subscription_tier: userPayload.subscription_tier,
        });

        // Set new access token in header or body (depending on client strategy)
        res.setHeader('X-New-Access-Token', newAccessToken);
        req.user = userPayload; // Attach user to request
        next();
      } catch (refreshError) {
        console.error('Refresh token error:', refreshError);
        return res.sendStatus(403); // Invalid or expired refresh token
      }
    } else {
      console.error('JWT authentication error:', error);
      return res.sendStatus(403); // Other JWT verification errors
    }
  }
};