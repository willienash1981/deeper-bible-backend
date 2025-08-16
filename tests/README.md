# 🧪 Deeper Bible Testing Framework

## Overview

Comprehensive testing infrastructure for the Deeper Bible backend application, including unit tests, integration tests, E2E tests, and performance benchmarks.

## 📁 Test Structure

```
tests/
├── unit/               # Unit tests for individual components
│   ├── services/       # Service layer tests
│   └── controllers/    # Controller tests
├── integration/        # Integration tests for API endpoints
│   └── api/           # API integration tests
├── e2e/               # End-to-end user journey tests
│   ├── global-setup.ts
│   ├── global-teardown.ts
│   └── user-journey.test.ts
├── performance/       # Performance and load tests
│   ├── load-test.ts
│   └── performance.test.ts
├── fixtures/          # Test data fixtures
├── utils/             # Testing utilities
│   ├── api-client.ts
│   ├── mock-factory.ts
│   └── test-helpers.ts
└── setup files        # Jest setup configurations
```

## 🚀 Quick Start

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only
npm run test:performance   # Performance tests
npm run test:coverage      # All tests with coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### CI Pipeline
```bash
npm run test:ci  # Runs lint, typecheck, and full test suite
```

## 🎯 Test Types

### Unit Tests
- **Purpose**: Test individual functions and classes in isolation
- **Location**: `tests/unit/`
- **Coverage Target**: 80%
- **Example**:
```typescript
describe('StructuredLLMService', () => {
  it('should generate analysis successfully', async () => {
    // Test implementation
  });
});
```

### Integration Tests
- **Purpose**: Test API endpoints with real database
- **Location**: `tests/integration/`
- **Coverage Target**: 80%
- **Database**: Uses test database with transactions
- **Example**:
```typescript
describe('Analysis API Integration', () => {
  it('should create analysis', async () => {
    const response = await apiClient.analyzeVerse('Genesis', 1, '1');
    expect(response.status).toBe(201);
  });
});
```

### E2E Tests
- **Purpose**: Test complete user workflows
- **Location**: `tests/e2e/`
- **Coverage Target**: 70%
- **Environment**: Full application stack
- **Example**:
```typescript
describe('User Journey', () => {
  it('Complete flow: Registration to Analysis', async () => {
    // Multi-step user journey
  });
});
```

### Performance Tests
- **Purpose**: Validate performance under load
- **Location**: `tests/performance/`
- **Tools**: autocannon for load testing via LoadTester utility
- **Automated Benchmarks**: Response time, throughput, error rates
- **Report Generation**: Markdown reports with detailed metrics
- **CI Integration**: Automated performance regression detection
- **Scenarios**:
  - Light Load: 10 concurrent connections
  - Normal Load: 50 concurrent connections  
  - Heavy Load: 100 concurrent connections
  - Stress Test: 200 concurrent connections
  - Spike Test: 500 concurrent connections

## 🛠️ Test Utilities

### ApiClient
Full-featured HTTP client for testing:
```typescript
const apiClient = new ApiClient(app);
await apiClient.authenticate(userId, role);
const response = await apiClient.analyzeVerse('Genesis', 1, '1');
```

### MockFactory
Generate test data:
```typescript
const user = MockFactory.createUser();
const analysis = MockFactory.createAnalysis();
const symbol = MockFactory.createSymbol();
```

### TestHelpers
Common testing utilities:
```typescript
TestHelpers.createMockRequest();
TestHelpers.createMockResponse();
TestHelpers.generateAuthToken(payload);
TestHelpers.cleanDatabase(prisma);
```

### LoadTester
Performance testing utilities:
```typescript
const loadTester = new LoadTester('http://localhost:3000');
const result = await loadTester.runLoadTest({
  url: '/api/endpoint',
  duration: 30,
  connections: 10
});
const validation = loadTester.validateBenchmarks(result);
const report = loadTester.generateReport([result], [validation]);
```

### Custom Matchers
Extended Jest matchers:
```typescript
expect('user@test.com').toBeValidEmail();
expect('uuid-string').toBeValidUUID();
expect('John 3:16').toBeValidBibleReference();
expect(response).toBeSuccessfulResponse();
expect(response.data).toMatchApiSchema('UserResponse');
```

## 📊 Coverage Reports

### View Coverage
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Coverage Thresholds
```javascript
{
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80
  },
  './src/ai/services/': {
    branches: 85,
    functions: 85,
    lines: 85
  },
  './src/api/controllers/': {
    branches: 90,
    functions: 90,
    lines: 90
  }
}
```

## 🔧 Configuration

### Jest Configuration
- **Main Config**: `jest.config.ts`
- **E2E Config**: `jest.e2e.config.ts`
- **Test Timeout**: 30 seconds (configurable)
- **Parallel Execution**: 50% of CPU cores

### Environment Variables
```env
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/deeper_bible_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test-jwt-secret
LOG_LEVEL=error
```

## 🐳 Docker Test Environment

### Start Test Services
```bash
docker-compose up -d postgres redis
```

### Run Tests in Docker
```bash
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## 📈 Performance Benchmarks

### Performance Benchmarks
| Metric | Target | Maximum |
|--------|--------|---------|
| P95 Response Time | < 500ms | 500ms |
| P99 Response Time | < 1000ms | 1000ms |
| Average Response Time | < 200ms | 200ms |
| Minimum Throughput | > 50 req/s | - |
| Error Rate | < 1% | 1% |

### Expected Performance by Endpoint
| Endpoint | Avg Latency | P95 Latency | Throughput |
|----------|-------------|-------------|------------|
| GET /health | < 50ms | < 100ms | > 200 req/s |
| GET /api/books | < 200ms | < 400ms | > 100 req/s |
| POST /auth/login | < 300ms | < 500ms | > 50 req/s |
| GET /api/users/profile | < 150ms | < 300ms | > 80 req/s |
| POST /api/books | < 500ms | < 1000ms | > 30 req/s |

## 🔍 Debugging Tests

### Run Single Test File
```bash
jest tests/unit/services/ai-service.test.ts
```

### Debug with VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

### View Console Output
```bash
DEBUG=* npm test
```

## 🚦 CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to main/develop branches
- Pull requests
- Scheduled daily runs

### Pipeline Stages
1. **Lint & Type Check**
2. **Unit Tests** (Matrix: Node 18, 20)
3. **Integration Tests**
4. **Performance Tests** (main branch only)
5. **Security Scan**
6. **Test Report Generation**

### Performance CI Integration
- Automated performance tests on main branch pushes
- Performance reports uploaded as artifacts
- Benchmark validation with pass/fail criteria
- Performance regression detection

## 📝 Writing New Tests

### Test Template
```typescript
import { TestHelpers } from '@test-utils/test-helpers';
import { MockFactory } from '@test-utils/mock-factory';

describe('Component Name', () => {
  let service: ServiceClass;
  let mockDependency: jest.Mocked<Dependency>;

  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should handle success case', async () => {
      // Arrange
      const input = MockFactory.createInput();
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toBeDefined();
    });

    it('should handle error case', async () => {
      // Test error handling
    });
  });
});
```

## 🎨 Custom Matchers

### Available Matchers
```typescript
expect(value).toBeWithinRange(min, max);
expect(response).toHaveStatus(200);
expect(array).toContainObject({ key: 'value' });
```

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Ensure PostgreSQL is running
docker-compose up -d postgres
# Check connection
psql postgresql://test:test@localhost:5432/deeper_bible_test
```

#### Redis Connection Failed
```bash
# Ensure Redis is running
docker-compose up -d redis
# Check connection
redis-cli ping
```

#### Port Already in Use
```bash
# Find and kill process using port
lsof -i :3000
kill -9 <PID>
```

#### Test Timeout
Increase timeout in test:
```typescript
jest.setTimeout(60000); // 60 seconds
```

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Autocannon Documentation](https://github.com/mcollina/autocannon)

## 🤝 Contributing

1. Write tests for new features
2. Ensure all tests pass before PR
3. Maintain or improve coverage
4. Follow testing patterns
5. Document complex test scenarios

## 📄 License

Part of the Deeper Bible project. All rights reserved.