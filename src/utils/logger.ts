import winston from 'winston';
import path from 'path';

const logDir = process.env.LOG_DIR || './logs';
const logLevel = process.env.LOG_LEVEL || 'info';
const isDevelopment = process.env.NODE_ENV === 'development';

// Create logger with proper configuration
export function createLogger(service: string): winston.Logger {
  const logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service: svc, ...meta }) => {
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level.toUpperCase()}] [${svc || service}]: ${message}${metaStr}`;
      })
    ),
    defaultMeta: { service },
    transports: [
      // File transport for all logs
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 10,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 20,
      }),
    ],
  });

  // Add console transport in development
  if (isDevelopment) {
    logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, service: svc, ...meta }) => {
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} [${level}] [${svc || service}]: ${message}${metaStr}`;
        })
      )
    }));
  }

  return logger;
}

// Global logger instance
export const logger = createLogger('Application');

// Export different log levels as convenient functions
export const logInfo = (message: string, meta?: any) => logger.info(message, meta);
export const logError = (message: string, error?: Error | any, meta?: any) => {
  logger.error(message, { error: error instanceof Error ? error.message : error, ...meta });
};
export const logWarn = (message: string, meta?: any) => logger.warn(message, meta);
export const logDebug = (message: string, meta?: any) => logger.debug(message, meta);