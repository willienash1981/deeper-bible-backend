import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan'; // For logging HTTP requests
import routes from './routes'; // Updated import
import * as redisConfig from './config/redis'; // Updated import
import { corsOptions } from './middleware/cors'; // Updated import

const app = express();

// Connect to Redis
redisConfig.connectRedis().catch((err: any) => {
  console.error('Failed to connect to Redis:', err);
  process.exit(1); // Exit process if Redis connection fails
});

// Middleware
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies
app.use(cors(corsOptions)); // Enable CORS with robust configuration
app.use(helmet()); // Add security headers
app.use(compression()); // Compress response bodies
app.use(morgan('dev')); // HTTP request logging

// Routes
app.use('/api', routes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Basic error handling (more sophisticated error handling can be added later)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

export default app;