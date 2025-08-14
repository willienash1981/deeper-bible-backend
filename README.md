# Deeper Bible Software

Backend software for the Deeper Bible project.

## Project Status

✅ **Jest/TypeScript Configuration Fixed**
- Created proper `tsconfig.json` and `tsconfig.test.json` files
- Set up Jest configuration with proper module resolution
- Added path mappings for TypeScript modules
- Installed necessary testing dependencies (supertest, @types/supertest)

✅ **Project Structure Established**
- `/src` - Source code directory
  - `/api` - API routes, controllers, middleware
  - `/ai` - AI services and utilities
  - `/shared` - Shared types and utilities
  - `/database` - Database models and migrations
- `/tests` - Test files
  - `/e2e` - End-to-end tests
- Configuration files properly set up

✅ **E2E Tests Configuration**
- Tests are now properly configured and can run
- Environment variables are set up for testing
- Module resolution issues have been resolved
- Route handlers properly bound to controller instances

## Running the Project

### Installation
```bash
npm install
```

### Running Tests
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## Environment Variables

The following environment variables need to be set:

```
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/deeper_bible
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
JWT_ACCESS_TOKEN_SECRET=your_access_token_secret
JWT_REFRESH_TOKEN_SECRET=your_refresh_token_secret
JWT_ACCESS_TOKEN_EXPIRES_IN=15m
JWT_REFRESH_TOKEN_EXPIRES_IN=7d
OPENAI_API_KEY=your_openai_api_key
CORS_ORIGIN=http://localhost:3000
OAUTH_CLIENT_ID=your_oauth_client_id
OAUTH_CLIENT_SECRET=your_oauth_client_secret
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Notes

The E2E tests require:
- PostgreSQL database running (for test database)
- Redis server running (for caching)
- Proper environment variables set

The tests will create and manage their own test database tables during execution.