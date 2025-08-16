import { CorsOptions } from 'cors';

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:5173',
  'https://deeperbible.com',
  'https://www.deeperbible.com',
  'https://api.deeperbible.com',
  'https://app.deeperbible.com',
  'https://staging.deeperbible.com',
  ...(process.env.CORS_ORIGINS?.split(',').filter(Boolean) || []),
];

const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, postman, etc) only in development
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    // Require origin in production
    if (!origin && process.env.NODE_ENV === 'production') {
      return callback(new Error('Origin required in production'));
    }

    // Check if origin is in allowed list
    if (origin && allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check for subdomain matching in production
    if (process.env.NODE_ENV === 'production' && origin) {
      const allowedDomains = ['deeperbible.com'];
      try {
        const originUrl = new URL(origin);
        
        const isAllowed = allowedDomains.some(domain => 
          originUrl.hostname === domain || 
          originUrl.hostname.endsWith(`.${domain}`)
        );

        if (isAllowed && originUrl.protocol === 'https:') {
          return callback(null, true);
        }
      } catch (error) {
        return callback(new Error('Invalid origin format'));
      }
    }

    // Development mode - allow localhost with any port over HTTP/HTTPS
    if (process.env.NODE_ENV === 'development' && origin) {
      try {
        const originUrl = new URL(origin);
        if ((originUrl.hostname === 'localhost' || originUrl.hostname === '127.0.0.1') &&
            ['http:', 'https:'].includes(originUrl.protocol)) {
          return callback(null, true);
        }
      } catch (error) {
        return callback(new Error('Invalid origin format'));
      }
    }

    // Log and reject the request
    console.warn(`CORS: Origin ${origin} rejected`);
    callback(new Error(`Origin ${origin} not allowed by CORS policy`));
  },
  
  // Credentials only when explicitly needed and in secure contexts
  credentials: process.env.NODE_ENV === 'production' ? false : true,
  
  maxAge: 86400, // 24 hours
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'X-API-Key',
    'Accept',
    'Accept-Language',
    'Content-Language',
    'Cache-Control',
  ],
  
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
    'Content-Range',
    'X-Content-Range',
    'X-Total-Count',
  ],
  
  optionsSuccessStatus: 204,
  
  // Preflight cache for 24 hours
  preflightContinue: false,
};

// Environment-specific validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.CORS_ORIGINS) {
    console.warn('WARNING: CORS_ORIGINS not set in production environment');
  }
}

export { corsOptions };