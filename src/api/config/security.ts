import { CorsOptions } from 'cors';

export const CORS_CONFIG: CorsOptions = {
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Other security related configurations can be added here
export const RATE_LIMITS = {
  analysis: {
    free: { windowMs: 3600000, max: 10 }, // 10 per hour
    premium: { windowMs: 3600000, max: 1000 }, // 1000 per hour
  },
  general: { windowMs: 900000, max: 100 }, // 100 per 15 minutes
  auth: { windowMs: 900000, max: 5 }, // 5 login attempts per 15 minutes
};