import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
const xss = require('xss');

export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  // In a production environment, ensure requests are over HTTPS
  // This is typically handled by a reverse proxy (e.g., Nginx, Load Balancer)
  // For development, this middleware might be skipped or configured differently.
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
};

// Enhanced Helmet configuration addressing audit findings
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: process.env.NODE_ENV === 'development' 
        ? ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net']
        : ["'self'", 'https://cdn.jsdelivr.net'], // Remove unsafe-inline in production
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.deeperbible.com'],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
      reportUri: '/api/security/csp-report',
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
});

// Additional security headers middleware addressing audit findings
export const additionalSecurityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Additional security headers not covered by Helmet or for reinforcement
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=(), interest-cohort=()'
  );
  
  // API-specific headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  
  // Remove server header for security
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

// Enhanced input sanitization addressing audit findings
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query) as any;
  }
  
  // Sanitize params
  if (req.params) {
    req.params = sanitizeObject(req.params) as any;
  }
  
  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    // Remove any potential XSS attacks
    return xss(obj, {
      whiteList: {}, // No HTML tags allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script'],
    });
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        // Prevent prototype pollution - audit finding addressed
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          console.warn(`Prototype pollution attempt blocked: ${key}`);
          continue;
        }
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Enhanced SQL injection prevention addressing audit findings
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  // More comprehensive SQL injection patterns
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|JAVASCRIPT)\b)/gi,
    /(--|\||\/\*|\*\/|xp_|sp_|<script|<\/script|javascript:|onerror=|onload=)/gi,
    /(\b(OR|AND)\b.*['"=])/gi, // Common SQL injection patterns
    /(UNION.*SELECT|SELECT.*FROM|INSERT.*INTO|UPDATE.*SET|DELETE.*FROM)/gi,
  ];
  
  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  const hasInjection = (obj: any): boolean => {
    if (checkForSQLInjection(obj)) return true;
    
    if (Array.isArray(obj)) {
      return obj.some(item => hasInjection(item));
    }
    
    if (obj && typeof obj === 'object') {
      return Object.values(obj).some(value => hasInjection(value));
    }
    
    return false;
  };
  
  // Check all input sources
  if (hasInjection(req.body) || hasInjection(req.query) || hasInjection(req.params)) {
    console.warn(`SQL injection attempt from ${req.ip}: ${JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
    })}`);
    
    return res.status(400).json({
      error: 'Invalid input detected',
      message: 'Request contains potentially harmful content',
    });
  }
  
  next();
};

// Enhanced security middleware addressing audit SQL injection weakness
export const preventSqlInjection = (req: Request, res: Response, next: NextFunction) => {
  // This is a more robust version replacing the basic regex approach
  const sanitize = (input: any): any => {
    if (typeof input === 'string') {
      // More comprehensive SQL injection detection
      const suspiciousPatterns = [
        /(\b(ALTER|CREATE|DELETE|DROP|EXEC|EXECUTE|INSERT|SELECT|UNION|UPDATE|SCRIPT)\b)/gi,
        /(--|\/\*|\*\/|xp_|sp_)/gi,
        /(\b(OR|AND)\b\s*(=|\b\d+\b|\b\w+\b)\s*(=|\b\d+\b|\b\w+\b))/gi,
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(input))) {
        throw new Error('Potential SQL injection detected.');
      }
      
      // Additional sanitization
      return input.replace(/[<>]/g, ''); // Remove angle brackets
    } else if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          // Prevent prototype pollution
          if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
            continue;
          }
          sanitized[key] = sanitize(input[key]);
        }
      }
      return sanitized;
    }
    return input;
  };

  try {
    if (req.body) req.body = sanitize(req.body);
    if (req.query) req.query = sanitize(req.query);
    if (req.params) req.params = sanitize(req.params);
    next();
  } catch (error: any) {
    console.warn(`Security middleware blocked request from ${req.ip}: ${error.message}`);
    res.status(400).json({ 
      error: 'Invalid input',
      message: 'Request contains invalid characters or patterns'
    });
  }
};

// MongoDB sanitization middleware
export const mongoSanitizeMiddleware = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }: { req: any; key: string }) => {
    console.warn(`Sanitized potentially malicious MongoDB data in ${key} from ${req.ip}`);
  },
});

// Combined security middleware stack addressing all audit findings
export const securityMiddleware = [
  helmetConfig,
  additionalSecurityHeaders,
  mongoSanitizeMiddleware,
  sanitizeInput,
  preventSQLInjection,
  enforceHttps,
];