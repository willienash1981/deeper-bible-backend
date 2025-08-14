import { Request, Response, NextFunction } from 'express';

export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  // In a production environment, ensure requests are over HTTPS
  // This is typically handled by a reverse proxy (e.g., Nginx, Load Balancer)
  // For development, this middleware might be skipped or configured differently.
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
};

export const preventSqlInjection = (req: Request, res: Response, next: NextFunction) => {
  // This is a very basic example and not a substitute for proper parameterized queries
  // and ORMs. It's more for illustrative purposes.
  const sanitize = (input: any) => {
    if (typeof input === 'string') {
      // Simple regex to detect common SQL injection patterns
      if (input.match(/['";\-\-`#\\]/)) {
        throw new Error('Potential SQL injection detected.');
      }
    } else if (typeof input === 'object' && input !== null) {
      for (const key in input) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          sanitize(input[key]);
        }
      }
    }
    return input;
  };

  try {
    sanitize(req.body);
    sanitize(req.query);
    sanitize(req.params);
    next();
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};