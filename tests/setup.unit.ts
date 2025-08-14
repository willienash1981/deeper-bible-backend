import './setup';

// Unit test specific setup
beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
});

// Mock external services for unit tests
jest.mock('@/ai/services/openai-client');
jest.mock('@/ai/services/pinecone.service');
jest.mock('@/api/cache/analysis-cache');
jest.mock('@/api/config/redis');

// Mock database connections
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    analysis: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    symbol: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    }
  }))
}));