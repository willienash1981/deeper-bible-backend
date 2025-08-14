import { Request, Response, NextFunction } from 'express';
import { DatabaseSecurityService } from '../services/security/database-security.service';
import { PrismaClient } from '@prisma/client';
import { SecretsManagerService } from '../services/security/secrets-manager.service';

export interface SecurityRequest extends Request {
  userId?: string;
  securityContext?: {
    ip: string;
    userAgent: string;
    startTime: number;
  };
}

export class SecurityMiddleware {
  private databaseSecurity: DatabaseSecurityService;
  private secretsManager: SecretsManagerService;

  constructor(prisma: PrismaClient, secretsManager: SecretsManagerService) {
    this.secretsManager = secretsManager;
    this.databaseSecurity = new DatabaseSecurityService(prisma, secretsManager);
  }

  /**
   * Initialize security middleware
   */
  async initialize(): Promise<void> {
    await this.databaseSecurity.initializeSecurity();
  }

  /**
   * IP whitelist middleware
   */
  ipWhitelist = (req: SecurityRequest, res: Response, next: NextFunction): void => {
    const clientIP = this.getClientIP(req);
    
    if (!this.databaseSecurity.isIPAllowed(clientIP)) {
      this.databaseSecurity.logSecurityEvent({
        event: 'unauthorized_ip_access',
        ip: clientIP,
        userAgent: req.get('User-Agent'),
        success: false,
        details: { 
          url: req.url, 
          method: req.method,
          headers: req.headers 
        },
      });

      res.status(403).json({ 
        error: 'Access denied',
        message: 'Your IP address is not authorized to access this service' 
      });
      return;
    }

    req.securityContext = {
      ip: clientIP,
      userAgent: req.get('User-Agent') || 'Unknown',
      startTime: Date.now(),
    };

    next();
  };

  /**
   * Rate limiting middleware
   */
  rateLimit = async (req: SecurityRequest, res: Response, next: NextFunction): Promise<void> => {
    const clientIP = this.getClientIP(req);
    const userId = req.userId || 'anonymous';

    const isAllowed = await this.databaseSecurity.checkRateLimit(userId, clientIP);
    
    if (!isAllowed) {
      res.status(429).json({ 
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.' 
      });
      return;
    }

    next();
  };

  /**
   * Connection limit middleware
   */
  connectionLimit = async (req: SecurityRequest, res: Response, next: NextFunction): Promise<void> => {
    const clientIP = this.getClientIP(req);
    const userId = req.userId || 'anonymous';

    const isAllowed = await this.databaseSecurity.checkConnectionLimit(userId, clientIP);
    
    if (!isAllowed) {
      res.status(503).json({ 
        error: 'Service unavailable',
        message: 'Connection limit exceeded for this user' 
      });
      return;
    }

    // Clean up connection on response end
    res.on('finish', () => {
      this.databaseSecurity.releaseConnection(userId, clientIP);
    });

    next();
  };

  /**
   * Query logging middleware
   */
  queryLogger = (req: SecurityRequest, res: Response, next: NextFunction): void => {
    const originalEnd = res.end;
    const startTime = Date.now();

    res.end = function(this: Response, ...args: any[]) {
      const duration = Date.now() - startTime;
      const userId = req.userId;
      
      // Log the query/request
      if (req.securityContext) {
        req.app.locals.databaseSecurity?.logQuery(
          `${req.method} ${req.url}`,
          userId,
          duration
        );
      }

      // Call original end method
      originalEnd.apply(this, args);
    };

    next();
  };

  /**
   * Security headers middleware
   */
  securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Content Security Policy
    res.setHeader('Content-Security-Policy', [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '));

    next();
  };

  /**
   * Request sanitization middleware
   */
  sanitizeRequest = (req: Request, res: Response, next: NextFunction): void => {
    // Basic SQL injection protection
    const suspiciousPatterns = [
      /(\s|^)(union|select|insert|update|delete|drop|create|alter|exec|execute)\s+/gi,
      /(\s|^)(or|and)\s+\d+\s*=\s*\d+/gi,
      /['"]\s*(or|and)\s*['"]\s*=\s*['"].*['"]$/gi,
      /;\s*(drop|delete|truncate|alter)/gi,
      /(\/\*|\*\/|--|#)/g
    ];

    const checkObject = (obj: any, path: string = ''): boolean => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          for (const pattern of suspiciousPatterns) {
            if (pattern.test(value)) {
              this.databaseSecurity.logSecurityEvent({
                event: 'suspicious_query_detected',
                userId: (req as SecurityRequest).userId,
                ip: this.getClientIP(req),
                userAgent: req.get('User-Agent'),
                success: false,
                details: { 
                  suspiciousValue: value,
                  fieldPath: `${path}.${key}`,
                  pattern: pattern.source
                },
              });
              return true;
            }
          }
        } else if (typeof value === 'object' && value !== null) {
          if (checkObject(value, `${path}.${key}`)) {
            return true;
          }
        }
      }
      return false;
    };

    // Check query parameters
    if (req.query && checkObject(req.query, 'query')) {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Suspicious content detected in request' 
      });
      return;
    }

    // Check request body
    if (req.body && checkObject(req.body, 'body')) {
      res.status(400).json({ 
        error: 'Invalid request',
        message: 'Suspicious content detected in request body' 
      });
      return;
    }

    next();
  };

  /**
   * Authentication logging middleware
   */
  authLogger = (req: SecurityRequest, res: Response, next: NextFunction): void => {
    const originalJson = res.json;

    res.json = function(this: Response, body: any) {
      // Log authentication events
      if (req.url.includes('/auth/') || req.url.includes('/login')) {
        const success = res.statusCode < 400;
        
        req.app.locals.databaseSecurity?.logSecurityEvent({
          event: success ? 'login_success' : 'login_failed',
          userId: req.userId || body?.userId,
          ip: req.securityContext?.ip,
          userAgent: req.securityContext?.userAgent,
          success,
          details: {
            statusCode: res.statusCode,
            endpoint: req.url,
            method: req.method,
          },
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };

  /**
   * Extract client IP address
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      '127.0.0.1'
    );
  }

  /**
   * Get database security service instance
   */
  getDatabaseSecurity(): DatabaseSecurityService {
    return this.databaseSecurity;
  }

  /**
   * Security monitoring endpoint middleware
   */
  securityMonitoring = async (req: Request, res: Response): Promise<void> => {
    try {
      const report = await this.databaseSecurity.generateSecurityReport();
      res.json({
        status: 'success',
        data: report,
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to generate security report',
        error: String(error),
      });
    }
  };

  /**
   * Emergency lockdown endpoint
   */
  emergencyLockdown = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.databaseSecurity.emergencyLockdown();
      res.json({
        status: 'success',
        message: 'Emergency lockdown completed',
        timestamp: new Date(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Failed to execute emergency lockdown',
        error: String(error),
      });
    }
  };
}