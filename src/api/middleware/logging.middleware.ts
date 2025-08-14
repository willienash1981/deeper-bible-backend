import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { v4 as uuidv4 } from 'uuid'; // For correlation IDs

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const correlationId = uuidv4();
  (req as any).correlationId = correlationId; // Attach correlation ID to request object

  const start = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const durationMs = (seconds * 1000) + (nanoseconds / 1e6);

    logger.info({
      correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      responseTimeMs: durationMs.toFixed(2),
    });
  });

  next();
};