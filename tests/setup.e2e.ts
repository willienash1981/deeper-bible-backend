import './setup';
import { Server } from 'http';
import { Application } from 'express';
import request from 'supertest';

let server: Server;
let app: Application;

beforeAll(async () => {
  // Import and start the application
  const { createApp } = await import('@/api/app');
  app = createApp();
  
  // Start server on random port for testing
  server = app.listen(0);
  
  // Wait for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Close server
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

// Export test client
export function getTestClient() {
  return request(app);
}

// Helper to create authenticated request
export async function authenticatedRequest(method: string, url: string) {
  const token = await generateTestToken();
  return getTestClient()
    [method.toLowerCase()](url)
    .set('Authorization', `Bearer ${token}`);
}

// Generate test JWT token
async function generateTestToken(userId = 'test-user-id', role = 'user') {
  const jwt = await import('jsonwebtoken');
  return jwt.sign(
    { userId, role, email: 'test@example.com' },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
}

export { app, server };