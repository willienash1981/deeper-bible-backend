import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../config/security';
import { AuthUser } from '../../shared/types/auth.types';

interface AuthRequest extends Request {
  user?: AuthUser;
}

// General API rate limiter
export const generalRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.general.windowMs,
  max: RATE_LIMITS.general.max,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Authentication rate limiter
export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.auth.windowMs,
  max: RATE_LIMITS.auth.max,
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// Analysis rate limiter (per user/IP)
export const analysisRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.analysis.free.windowMs,
  max: RATE_LIMITS.analysis.free.max, // Default to free tier limit
  keyGenerator: (req: AuthRequest) => {
    // Use user ID if authenticated, otherwise fall back to IP
    return req.user?.id || req.ip || 'anonymous';
  },
  message: 'Too many analysis requests. Upgrade to premium for unlimited access.',
  standardHeaders: true,
  legacyHeaders: false,
  // Dynamic max based on user tier
  handler: (req: AuthRequest, res: Response, next: NextFunction, options) => {
    const userTier = req.user?.subscription_tier;
    if (userTier === 'premium') {
      options.max = RATE_LIMITS.analysis.premium.max;
    }
    // Continue with default handler (sends 429)
    res.status(options.statusCode).send(options.message);
  },
});
