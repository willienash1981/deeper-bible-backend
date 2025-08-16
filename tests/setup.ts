import 'reflect-metadata';
import { TextEncoder, TextDecoder } from 'util';
import fetch from 'node-fetch';

// Import and register custom matchers
import { customMatchers } from './utils/custom-matchers';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;
(global as any).fetch = fetch;

// Environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/deeper_bible_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.PINECONE_API_KEY = 'test-pinecone-key';
process.env.PINECONE_ENVIRONMENT = 'test';
process.env.PINECONE_INDEX = 'test-index';
process.env.LOG_LEVEL = 'error';

// Mock console methods during tests
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

beforeAll(() => {
  // Suppress console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    console.info = jest.fn();
    console.debug = jest.fn();
  }
});

afterAll(() => {
  // Restore console methods
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.info = originalConsole.info;
  console.debug = originalConsole.debug;
});

// Global test timeout
jest.setTimeout(30000);

// Register all custom matchers with Jest
expect.extend(customMatchers);