# Developer Guide

Welcome to the Deeper Bible Backend development guide. This comprehensive guide will get you up and running with the codebase in under 30 minutes.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software
- **Node.js**: 20.x or higher
- **npm**: 9.x or higher
- **Docker**: Latest stable version
- **Docker Compose**: v2.x
- **Git**: Latest version

### Recommended Tools
- **VS Code** with recommended extensions
- **Postman** or **Insomnia** for API testing
- **DBeaver** or **pgAdmin** for database management
- **Redis Desktop Manager** for cache inspection

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space
- **OS**: macOS, Linux, or Windows with WSL2

## Quick Start

### 1. Environment Setup

```bash
# Clone the repository
git clone <repository-url>
cd deeper-bible-software

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` file with your configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/deeper_bible"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# JWT Configuration
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="24h"

# OpenAI Configuration
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4"

# Pinecone Configuration (for vector search)
PINECONE_API_KEY="your-pinecone-api-key"
PINECONE_ENVIRONMENT="your-environment"
PINECONE_INDEX_NAME="deeper-bible-embeddings"

# Application Configuration
NODE_ENV="development"
PORT=3000
API_BASE_URL="http://localhost:3000"
```

### 3. Start Development Environment

```bash
# Start PostgreSQL and Redis with Docker
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready (check with)
docker-compose -f docker-compose.dev.yml ps

# Run database migrations
npm run db:migrate

# Seed database with initial data (optional)
npm run db:seed

# Start the development server
npm run dev
```

### 4. Verify Installation

```bash
# Check API health
curl http://localhost:3000/api/health

# Check API documentation
open http://localhost:3000/docs
```

## Architecture Overview

### System Architecture

```mermaid
graph TB
    Client[Client Applications] --> API[Express.js API Server]
    API --> Auth[Authentication Service]
    API --> Analysis[Analysis Service]
    API --> Cache[Redis Cache]
    API --> DB[PostgreSQL Database]
    API --> AI[OpenAI Service]
    API --> Vector[Pinecone Vector DB]
    
    Analysis --> AI
    Analysis --> Vector
    Analysis --> Cache
    
    subgraph "External Services"
        AI
        Vector
    end
    
    subgraph "Data Layer"
        DB
        Cache
    end
```

### Directory Structure

```
src/
├── api/                    # API layer
│   ├── controllers/        # Route handlers
│   ├── middleware/         # Custom middleware
│   ├── routes/            # Route definitions
│   └── server.ts          # Express server setup
├── services/              # Business logic
│   ├── bible/             # Bible data services
│   ├── database/          # Database operations
│   └── monitoring/        # Health monitoring
├── ai/                    # AI-related services
│   ├── services/          # AI service implementations
│   ├── prompts/           # AI prompts and templates
│   └── utils/             # AI utilities
├── shared/                # Shared utilities
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Common utilities
└── config/                # Configuration files
```

### Key Components

#### 1. API Layer (`src/api/`)
- **Express.js** server with TypeScript
- **Route handlers** for all endpoints
- **Middleware** for authentication, validation, logging
- **Error handling** with standardized responses

#### 2. Services Layer (`src/services/`)
- **Database service** with connection pooling
- **Bible service** for scripture data
- **Monitoring service** for health checks

#### 3. AI Layer (`src/ai/`)
- **OpenAI integration** for text analysis
- **Pinecone integration** for vector search
- **Prompt management** for consistent AI responses
- **Content moderation** for safe outputs

#### 4. Authentication System
- **JWT-based** authentication
- **Google OAuth** integration
- **Role-based access control** (RBAC)
- **Token refresh** mechanism

## Development Workflow

### Branch Strategy

We use **Git Flow** with the following branches:

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `hotfix/*` - Critical production fixes

### Feature Development

```bash
# Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/your-feature-name
# Create Pull Request to develop branch
```

### Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add new API endpoint for symbol analysis
fix: resolve authentication token expiry issue
docs: update API documentation
test: add integration tests for analysis service
refactor: optimize database queries
perf: improve response time for analysis endpoint
```

### Code Review Process

1. **Self Review**: Review your own code before creating PR
2. **Automated Checks**: All tests and linting must pass
3. **Peer Review**: At least one approval required
4. **Security Review**: For security-related changes
5. **Documentation**: Update docs if needed

## Code Standards

### TypeScript Guidelines

```typescript
// Use strict typing
interface AnalysisRequest {
  verse_range: string;
  translation?: string;
  analysis_type: AnalysisType[];
}

// Use descriptive names
const analyzeVerseWithAI = async (request: AnalysisRequest): Promise<AnalysisResult> => {
  // Implementation
};

// Use proper error handling
try {
  const result = await analyzeVerseWithAI(request);
  return result;
} catch (error) {
  logger.error('Analysis failed', { error, request });
  throw new AnalysisError('Failed to analyze verse', error);
}
```

### API Design Principles

1. **RESTful**: Follow REST conventions
2. **Consistent**: Use standard HTTP status codes
3. **Versioned**: API versioning for breaking changes
4. **Documented**: All endpoints documented in OpenAPI
5. **Secure**: Authentication and input validation

### Error Handling

```typescript
// Custom error classes
export class AnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'ANALYSIS_ERROR',
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AnalysisError';
  }
}

// Error middleware
export const errorHandler = (error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Request failed', { error, path: req.path, method: req.method });
  
  if (error instanceof AnalysisError) {
    return res.status(error.statusCode).json({
      error: error.code,
      message: error.message
    });
  }
  
  // Default error response
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
};
```

### Database Best Practices

```typescript
// Use connection pooling
const db = new DatabaseService({
  maxConnections: 20,
  idleTimeout: 30000,
  connectionTimeout: 5000
});

// Use transactions for multiple operations
const createUserWithProfile = async (userData: UserData, profileData: ProfileData) => {
  const transaction = await db.beginTransaction();
  try {
    const user = await db.users.create(userData, { transaction });
    const profile = await db.profiles.create({ ...profileData, userId: user.id }, { transaction });
    
    await transaction.commit();
    return { user, profile };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

## Testing

### Testing Strategy

1. **Unit Tests**: Individual function/class testing
2. **Integration Tests**: Service integration testing
3. **API Tests**: Full API endpoint testing
4. **Performance Tests**: Load testing with autocannon

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:api          # API tests
npm run test:e2e          # End-to-end tests

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Examples

#### Unit Test Example
```typescript
// src/ai/services/__tests__/analysis.service.test.ts
describe('AnalysisService', () => {
  let analysisService: AnalysisService;
  
  beforeEach(() => {
    analysisService = new AnalysisService({
      openaiClient: mockOpenAIClient,
      cacheService: mockCacheService
    });
  });
  
  describe('analyzeVerse', () => {
    it('should return theological analysis for valid verse', async () => {
      // Arrange
      const request = {
        verse_range: 'John 3:16',
        translation: 'ESV',
        analysis_type: ['theological']
      };
      
      // Act
      const result = await analysisService.analyzeVerse(request);
      
      // Assert
      expect(result).toHaveProperty('analysis.theological');
      expect(result.confidence_score).toBeGreaterThan(0.5);
    });
  });
});
```

#### Integration Test Example
```typescript
// tests/integration/api/analysis.test.ts
describe('Analysis API Integration', () => {
  it('POST /api/analysis should return analysis result', async () => {
    const response = await request(app)
      .post('/api/analysis')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        verse_range: 'John 3:16',
        translation: 'ESV',
        analysis_type: ['theological']
      })
      .expect(200);
      
    expect(response.body).toHaveProperty('analysis');
    expect(response.body).toHaveProperty('verse_range', 'John 3:16');
  });
});
```

### Performance Testing

```bash
# Load test the API
npm run test:performance

# Or run autocannon directly
npx autocannon -c 10 -d 30 http://localhost:3000/api/health
```

## Database Development

### Running Migrations

```bash
# Create new migration
npm run db:migration:create "add_user_preferences"

# Run pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:rollback

# Check migration status
npm run db:migration:status
```

### Database Schema Management

```typescript
// Example migration
exports.up = async (knex) => {
  await knex.schema.createTable('analysis_results', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('verse_range').notNullable();
    table.string('translation').defaultTo('ESV');
    table.jsonb('analysis').notNullable();
    table.decimal('confidence_score', 3, 2);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'created_at']);
    table.index('verse_range');
  });
};
```

## Monitoring and Debugging

### Logging

```typescript
// Use structured logging
import { logger } from '@/utils/logger';

logger.info('Analysis request received', {
  userId: req.user.id,
  verseRange: request.verse_range,
  requestId: req.id
});

logger.error('Analysis failed', {
  error: error.message,
  stack: error.stack,
  userId: req.user.id,
  verseRange: request.verse_range
});
```

### Health Checks

```bash
# Check application health
curl http://localhost:3000/api/health

# Check individual services
curl http://localhost:3000/api/health/database
curl http://localhost:3000/api/health/redis
curl http://localhost:3000/api/health/openai
```

### Performance Monitoring

```bash
# Monitor API performance
npm run monitor:api

# Check database performance
npm run monitor:database

# Monitor memory usage
npm run monitor:memory
```

## IDE Setup

### VS Code Configuration

Recommended extensions (`.vscode/extensions.json`):

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "ms-vscode-remote.remote-containers"
  ]
}
```

Settings (`.vscode/settings.json`):

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/.env": true
  }
}
```

### Debug Configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug API Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/src/api/server.ts",
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "restart": true,
      "runtimeArgs": ["-r", "ts-node/register"]
    }
  ]
}
```

## Security Considerations

### Environment Variables
- Never commit `.env` files
- Use strong, unique passwords
- Rotate API keys regularly
- Use different keys for different environments

### Authentication
- Implement proper JWT token validation
- Use short token expiry times
- Implement token refresh mechanism
- Log security events

### Input Validation
```typescript
import joi from 'joi';

const analysisRequestSchema = joi.object({
  verse_range: joi.string().required().pattern(/^[A-Za-z0-9 :-]+$/),
  translation: joi.string().valid('ESV', 'KJV', 'NIV', 'NASB', 'NLT', 'NKJV'),
  analysis_type: joi.array().items(joi.string().valid('theological', 'historical', 'symbolic'))
});
```

## Troubleshooting

For common issues and solutions, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Next Steps

1. Read the [Operations Guide](../operations/README.md)
2. Explore the [API Examples](../examples/README.md)
3. Check out the [Architecture Decisions](../architecture/README.md)
4. Join our developer community

---

**Need Help?**
- 📧 **Email**: dev-support@deeperbible.com
- 💬 **Discord**: [Developer Channel](https://discord.gg/deeperbible-dev)
- 📖 **Documentation**: [Full Docs](https://docs.deeperbible.com)