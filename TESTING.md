# Testing Framework Documentation

## Overview

This document provides comprehensive guidance for using the testing framework in the Deeper Bible backend application. The framework includes unit tests, integration tests, end-to-end (E2E) tests, and performance tests.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Test Utilities](#test-utilities)
5. [Writing Tests](#writing-tests)
6. [Performance Testing](#performance-testing)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites

- Node.js 18+ or 20+
- Docker and Docker Compose
- PostgreSQL and Redis (or use Docker services)

### Setup Test Environment

```bash
# Install dependencies
npm ci

# Generate Prisma client
npx prisma generate

# Start test services (PostgreSQL + Redis)
chmod +x scripts/test-env.sh
./scripts/test-env.sh start

# Run database migrations
./scripts/test-env.sh migrate

# Run all tests
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── utils/                      # Test utilities
│   ├── mock-factory.ts         # Data mocking utilities
│   ├── test-helpers.ts         # Test helper functions
│   ├── api-client.ts           # HTTP client for testing
│   ├── custom-matchers.ts      # Custom Jest matchers
│   └── load-tester.ts          # Performance testing utilities
├── unit/                       # Unit tests
│   ├── services/               # Service layer tests
│   ├── controllers/            # Controller tests
│   └── models/                 # Model tests
├── integration/                # Integration tests
│   ├── api/                    # API endpoint tests
│   └── database/               # Database tests
├── e2e/                        # End-to-end tests
│   └── api/                    # Full API workflow tests
└── performance/                # Performance tests
    └── api-endpoints.performance.test.ts
```

## Running Tests

### Available Test Commands

```bash
# Run all tests with coverage
npm run test:coverage

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only  
npm run test:e2e           # End-to-end tests only
npm run test:performance   # Performance tests only

# Run tests in watch mode (development)
npm run test:watch

# Run CI test suite
npm run test:ci
```

### Using Test Environment Script

```bash
# Start test environment
./scripts/test-env.sh start

# Stop test environment  
./scripts/test-env.sh stop

# Reset test environment (clean data)
./scripts/test-env.sh reset

# Run migrations
./scripts/test-env.sh migrate

# Run specific test types
./scripts/test-env.sh test unit
./scripts/test-env.sh test integration
./scripts/test-env.sh test e2e
./scripts/test-env.sh test performance

# Show environment status
./scripts/test-env.sh status

# Show logs
./scripts/test-env.sh logs
./scripts/test-env.sh logs postgres-test

# Clean test data (keep structure)
./scripts/test-env.sh clean
```

## Test Utilities

### MockFactory

Generate realistic test data:

```typescript
import { MockFactory } from '../utils/mock-factory';

// Generate mock user
const user = MockFactory.createUser({
  email: 'custom@example.com'
});

// Generate multiple users
const users = MockFactory.createUsers(5);

// Generate mock book
const book = MockFactory.createBook({
  title: 'Custom Title'
});
```

### TestHelpers

Common test utilities:

```typescript
import { TestHelpers } from '../utils/test-helpers';

describe('My Test', () => {
  beforeAll(async () => {
    await TestHelpers.setupTestEnvironment();
  });

  afterAll(async () => {
    await TestHelpers.cleanupTestEnvironment();
  });

  beforeEach(async () => {
    await TestHelpers.clearTestData();
  });

  test('should work', async () => {
    const mockReq = TestHelpers.createMockRequest({
      body: { key: 'value' }
    });
    const mockRes = TestHelpers.createMockResponse();
    
    // Your test code here
  });
});
```

### ApiClient

HTTP client for integration and E2E tests:

```typescript
import { ApiClient } from '../utils/api-client';

describe('API Integration Tests', () => {
  let apiClient: ApiClient;

  beforeAll(() => {
    apiClient = new ApiClient();
  });

  test('should create user', async () => {
    const response = await apiClient.post('/api/users', {
      name: 'Test User',
      email: 'test@example.com'
    });
    
    expect(response.status).toBe(201);
    expect(response.data).toHaveProperty('id');
  });
  
  test('should handle authentication', async () => {
    const authResponse = await apiClient.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    const token = authResponse.data.token;
    
    const response = await apiClient.get('/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    expect(response.status).toBe(200);
  });
});
```

### Custom Matchers

Extended Jest matchers:

```typescript
// Available custom matchers
expect(email).toBeValidEmail();
expect(uuid).toBeValidUUID();
expect(reference).toBeValidBibleReference();
expect(response).toBeSuccessfulResponse();
expect(response).toHaveValidationErrors(['field1', 'field2']);

// HTTP response matchers
expect(response).toHaveStatus(200);
expect(response).toHaveHeader('content-type', 'application/json');
expect(response).toMatchApiSchema('UserResponse');
```

## Writing Tests

### Unit Tests

Test individual functions/methods in isolation:

```typescript
// tests/unit/services/user.service.test.ts
import { UserService } from '../../../src/services/user.service';
import { MockFactory } from '../../utils/mock-factory';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('createUser', () => {
    test('should create user with valid data', async () => {
      const userData = MockFactory.createUser();
      
      const result = await userService.createUser(userData);
      
      expect(result).toHaveProperty('id');
      expect(result.email).toBe(userData.email);
      expect(result).toBeValidUser();
    });

    test('should throw error for invalid email', async () => {
      const userData = MockFactory.createUser({
        email: 'invalid-email'
      });
      
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid email format');
    });
  });
});
```

### Integration Tests

Test interactions between components:

```typescript
// tests/integration/api/users.test.ts
import { ApiClient } from '../../utils/api-client';
import { TestHelpers } from '../../utils/test-helpers';
import { MockFactory } from '../../utils/mock-factory';

describe('Users API Integration', () => {
  let apiClient: ApiClient;

  beforeAll(async () => {
    await TestHelpers.setupTestEnvironment();
    apiClient = new ApiClient();
  });

  afterAll(async () => {
    await TestHelpers.cleanupTestEnvironment();
  });

  beforeEach(async () => {
    await TestHelpers.clearTestData();
  });

  describe('POST /api/users', () => {
    test('should create user and store in database', async () => {
      const userData = MockFactory.createUser();
      
      const response = await apiClient.post('/api/users', userData);
      
      expect(response).toBeSuccessfulResponse();
      expect(response.data).toMatchApiSchema('UserResponse');
      
      // Verify data persisted in database
      const dbUser = await TestHelpers.findUserInDatabase(response.data.id);
      expect(dbUser).toBeDefined();
      expect(dbUser.email).toBe(userData.email);
    });
  });
});
```

### E2E Tests

Test complete user workflows:

```typescript
// tests/e2e/api/user-registration-flow.test.ts
describe('User Registration Flow', () => {
  let apiClient: ApiClient;

  beforeAll(async () => {
    await TestHelpers.setupTestEnvironment();
    apiClient = new ApiClient();
  });

  test('complete user registration and login flow', async () => {
    const userData = MockFactory.createUser();
    
    // Step 1: Register user
    const registerResponse = await apiClient.post('/auth/register', userData);
    expect(registerResponse).toHaveStatus(201);
    
    // Step 2: Login with credentials
    const loginResponse = await apiClient.post('/auth/login', {
      email: userData.email,
      password: userData.password
    });
    expect(loginResponse).toHaveStatus(200);
    expect(loginResponse.data).toHaveProperty('token');
    
    // Step 3: Access protected endpoint
    const token = loginResponse.data.token;
    const profileResponse = await apiClient.get('/api/users/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(profileResponse).toHaveStatus(200);
    expect(profileResponse.data.email).toBe(userData.email);
  });
});
```

## Performance Testing

### Load Testing

Use the LoadTester utility for performance tests:

```typescript
// tests/performance/api-endpoints.performance.test.ts
import { LoadTester } from '../utils/load-tester';

describe('API Performance Tests', () => {
  let loadTester: LoadTester;

  beforeAll(() => {
    loadTester = new LoadTester('http://localhost:3000');
  });

  test('health endpoint performance', async () => {
    const result = await loadTester.runLoadTest({
      url: '/health',
      duration: 10,
      connections: 10
    });

    const validation = loadTester.validateBenchmarks(result);
    
    expect(validation.passed).toBe(true);
    expect(result.latency.average).toBeLessThan(100);
    expect(result.errors).toBe(0);
  });

  test('authenticated endpoint performance', async () => {
    const result = await loadTester.runAuthenticatedLoadTest(
      '/api/users/profile',
      'GET',
      undefined,
      { duration: 15, connections: 8 }
    );

    expect(result.latency.p99).toBeLessThan(1000);
  });
});
```

### Performance Benchmarks

Default performance benchmarks:

- **Response Time**: P95 < 500ms, P99 < 1000ms, Average < 200ms
- **Throughput**: Minimum 50 req/s, Target 100 req/s  
- **Error Rate**: Maximum 1%
- **Concurrent Load**: 50 users, 10 connections

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- All pull requests
- Pushes to main/develop branches
- Daily scheduled runs (2 AM UTC)

### Test Workflow

1. **Lint and Type Check**: Code quality validation
2. **Unit Tests**: Fast isolated tests (Node 18.x, 20.x)
3. **Integration Tests**: Database-dependent tests
4. **Performance Tests**: Load testing (main branch only)
5. **Security Scan**: Dependency vulnerability scanning

### Coverage Requirements

- **Unit Test Coverage**: Minimum 80%
- **Integration Coverage**: Minimum 70%
- **Overall Coverage**: Minimum 75%

### Reports and Artifacts

- Test coverage reports uploaded to Codecov
- Performance reports saved as artifacts
- JUnit XML reports for CI integration
- HTML reports for detailed analysis

## Troubleshooting

### Common Issues

#### Tests Timing Out

```bash
# Increase Jest timeout
jest --testTimeout=60000

# Or in test file:
jest.setTimeout(60000);
```

#### Database Connection Issues

```bash
# Check Docker services
./scripts/test-env.sh status

# Reset environment
./scripts/test-env.sh reset

# Check database connection
docker-compose -f docker-compose.test.yml exec postgres-test pg_isready -U test
```

#### Port Conflicts

```bash
# Stop conflicting services
sudo lsof -i :5432
sudo lsof -i :6379

# Use different ports in docker-compose.test.yml
# postgres-test: "5433:5432"
# redis-test: "6380:6379"
```

#### Out of Memory Issues

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Run tests with limited workers
npm run test -- --maxWorkers=2
```

### Debug Mode

```bash
# Run tests in debug mode
npm run test -- --detectOpenHandles --forceExit

# Run specific test file
npm run test -- tests/unit/services/user.service.test.ts

# Run tests matching pattern
npm run test -- --testNamePattern="should create user"
```

### Environment Variables

```bash
# Test environment variables
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5433/deeper_bible_test
REDIS_URL=redis://localhost:6380
JWT_SECRET=test-jwt-secret
LOG_LEVEL=error
TEST_TIMEOUT=60000
```

### Performance Debugging

```bash
# Run performance tests with detailed output
npm run test:performance -- --verbose

# Generate performance reports
./scripts/test-env.sh test performance

# Monitor system resources during tests
top -pid $(pgrep -f "npm.*test:performance")
```

## Best Practices

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the expected behavior
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent** - each test should be runnable in isolation
5. **Clean up after tests** - use proper setup/teardown

### Test Data

1. **Use MockFactory** for consistent test data generation
2. **Avoid hardcoded values** - use factories and helpers
3. **Clear data between tests** to prevent interference
4. **Use realistic data** for better test coverage

### Performance

1. **Use appropriate test types** - don't use E2E for unit test scenarios  
2. **Run tests in parallel** when possible
3. **Mock external dependencies** in unit tests
4. **Use transactions** for database test isolation

### Maintenance

1. **Keep tests up-to-date** with code changes
2. **Remove obsolete tests** when refactoring
3. **Update test documentation** when adding new patterns
4. **Monitor test execution times** and optimize slow tests

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Autocannon Documentation](https://github.com/mcollina/autocannon)

---

*For questions or issues, please refer to the project documentation or contact the development team.*