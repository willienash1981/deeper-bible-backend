# Troubleshooting Guide

This guide covers common issues developers encounter and their solutions.

## 📋 Table of Contents

- [Setup Issues](#setup-issues)
- [Database Problems](#database-problems)
- [Authentication Issues](#authentication-issues)
- [API Errors](#api-errors)
- [Performance Issues](#performance-issues)
- [Docker Problems](#docker-problems)
- [Testing Issues](#testing-issues)

## Setup Issues

### Node Version Mismatch

**Problem**: Getting version compatibility errors during `npm install`

**Solution**:
```bash
# Check your Node version
node --version

# Should be 20.x or higher
# Use nvm to switch versions
nvm install 20
nvm use 20

# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Missing Environment Variables

**Problem**: Server fails to start with environment variable errors

**Solution**:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your actual values
# Required variables:
# - DATABASE_URL
# - REDIS_URL
# - JWT_SECRET
# - OPENAI_API_KEY

# Validate environment
npm run validate:env
```

### Port Already in Use

**Problem**: `Error: listen EADDRINUSE :::3000`

**Solution**:
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or use a different port
PORT=3001 npm run dev
```

## Database Problems

### Connection Failed

**Problem**: `Database connection failed`

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# Start database if not running
docker-compose -f docker-compose.dev.yml up -d db

# Check database logs
docker-compose -f docker-compose.dev.yml logs db

# Test connection manually
psql postgresql://postgres:password@localhost:5432/deeper_bible
```

### Migration Errors

**Problem**: `Migration failed` or schema out of sync

**Solution**:
```bash
# Check migration status
npm run db:migration:status

# Reset database (WARNING: destroys all data)
npm run db:reset

# Run migrations step by step
npm run db:migrate:up

# If specific migration fails, check the migration file
# Fix the SQL and retry
```

### Database Locked

**Problem**: `Database is locked` or connection timeout

**Solution**:
```bash
# Check active connections
SELECT pid, usename, state, query FROM pg_stat_activity;

# Kill long-running queries (in psql)
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active';

# Restart database container
docker-compose -f docker-compose.dev.yml restart db
```

## Authentication Issues

### JWT Token Invalid

**Problem**: `401 Unauthorized` or `Invalid token`

**Solution**:
```bash
# Check JWT_SECRET in .env
echo $JWT_SECRET

# Verify token format (should be Bearer <token>)
curl -H "Authorization: Bearer <your-token>" http://localhost:3000/api/users/profile

# Debug token in JWT debugger: https://jwt.io
# Check expiration time

# Generate new token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'
```

### Google OAuth Not Working

**Problem**: OAuth redirect fails or invalid client

**Solution**:
```bash
# Check Google OAuth configuration
echo $GOOGLE_CLIENT_ID
echo $GOOGLE_CLIENT_SECRET

# Verify redirect URLs in Google Console
# Should match: http://localhost:3000/api/auth/google/callback

# Test OAuth flow manually
open "https://accounts.google.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/api/auth/google/callback&scope=email%20profile&response_type=code"
```

## API Errors

### 500 Internal Server Error

**Problem**: Generic server error with no details

**Solution**:
```bash
# Check server logs
npm run dev # Look at console output

# Or check log files
tail -f logs/app.log

# Enable debug logging
DEBUG=* npm run dev

# Check specific error endpoint
curl -v http://localhost:3000/api/health
```

### Rate Limiting Issues

**Problem**: `429 Too Many Requests`

**Solution**:
```bash
# Check Redis connection (rate limiting storage)
redis-cli ping

# Clear rate limit for testing
redis-cli flushall

# Adjust rate limits in config
# Edit src/api/middleware/rate-limit.middleware.ts

# Disable rate limiting for development
DISABLE_RATE_LIMITING=true npm run dev
```

### OpenAI API Errors

**Problem**: AI analysis fails or quota exceeded

**Solution**:
```bash
# Check OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check usage limits
# Visit https://platform.openai.com/usage

# Use fallback model
OPENAI_MODEL="gpt-3.5-turbo" npm run dev

# Enable AI request logging
AI_DEBUG=true npm run dev
```

## Performance Issues

### Slow API Responses

**Problem**: API endpoints taking too long to respond

**Solution**:
```bash
# Profile API performance
npm run test:performance

# Check database query performance
QUERY_LOGGING=true npm run dev

# Monitor Redis cache hit rates
redis-cli info stats

# Enable APM monitoring
npm run monitor:api

# Optimize slow queries
EXPLAIN ANALYZE SELECT * FROM analysis_results WHERE user_id = 'uuid';
```

### High Memory Usage

**Problem**: Node.js process consuming too much memory

**Solution**:
```bash
# Monitor memory usage
npm run monitor:memory

# Generate heap snapshot
kill -USR2 <node-pid>

# Analyze with clinic
npx clinic doctor -- npm start

# Check for memory leaks
NODE_OPTIONS="--max-old-space-size=4096" npm run dev
```

### Cache Issues

**Problem**: Stale data or cache misses

**Solution**:
```bash
# Check Redis connection
redis-cli ping

# Monitor cache statistics
redis-cli info stats

# Clear specific cache keys
redis-cli del "analysis:*"

# Disable cache for debugging
DISABLE_CACHE=true npm run dev

# Check cache configuration
redis-cli config get maxmemory-policy
```

## Docker Problems

### Container Won't Start

**Problem**: Docker containers failing to start

**Solution**:
```bash
# Check Docker daemon
docker ps

# Check container logs
docker-compose -f docker-compose.dev.yml logs db
docker-compose -f docker-compose.dev.yml logs redis

# Rebuild containers
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d

# Check disk space
df -h
```

### Volume Mount Issues

**Problem**: File changes not reflected in container

**Solution**:
```bash
# Check mount points
docker-compose -f docker-compose.dev.yml config

# On Windows/Mac, check Docker settings
# Ensure file sharing is enabled for project directory

# Force recreation
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

### Network Issues

**Problem**: Containers can't communicate

**Solution**:
```bash
# Check network configuration
docker network ls
docker network inspect deeper_bible_default

# Test container connectivity
docker exec -it deeper_bible_api ping db
docker exec -it deeper_bible_api ping redis

# Recreate network
docker-compose -f docker-compose.dev.yml down
docker network prune
docker-compose -f docker-compose.dev.yml up -d
```

## Testing Issues

### Tests Failing

**Problem**: Tests fail unexpectedly

**Solution**:
```bash
# Run tests with verbose output
npm run test -- --verbose

# Run specific test suite
npm run test:unit -- --testNamePattern="AnalysisService"

# Check test database
TEST_DATABASE_URL="postgresql://postgres:password@localhost:5432/deeper_bible_test"

# Reset test environment
npm run test:setup

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand tests/specific-test.ts
```

### Test Database Issues

**Problem**: Test database contamination or connection issues

**Solution**:
```bash
# Create separate test database
createdb deeper_bible_test

# Run migrations on test DB
NODE_ENV=test npm run db:migrate

# Clear test data
npm run test:cleanup

# Use in-memory database for faster tests
TEST_DATABASE_URL="sqlite::memory:" npm test
```

### Mocking Issues

**Problem**: External services not properly mocked

**Solution**:
```typescript
// Mock OpenAI service
jest.mock('@/ai/services/openai-client', () => ({
  OpenAIClient: jest.fn().mockImplementation(() => ({
    analyze: jest.fn().mockResolvedValue({ analysis: 'mocked result' })
  }))
}));

// Mock Redis
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  };
  return jest.fn(() => mockRedis);
});
```

## Common Error Messages

### "Cannot resolve module"

**Solution**:
```bash
# Check TypeScript path mapping in tsconfig.json
# Ensure baseUrl and paths are configured correctly

# Clear TypeScript cache
npx tsc --build --clean

# Reinstall dependencies
rm -rf node_modules
npm install
```

### "Port 5432 is not available"

**Solution**:
```bash
# Check if PostgreSQL is already running locally
brew services stop postgresql
# or
sudo systemctl stop postgresql

# Use different port in docker-compose.dev.yml
ports:
  - "5433:5432"
```

### "Redis connection refused"

**Solution**:
```bash
# Check Redis container status
docker-compose -f docker-compose.dev.yml ps redis

# Restart Redis
docker-compose -f docker-compose.dev.yml restart redis

# Check Redis port
netstat -an | grep 6379
```

## Debug Tools

### Enable Debug Logging

```bash
# Full debug output
DEBUG=* npm run dev

# Specific modules
DEBUG="app:*,database:*" npm run dev

# SQL query logging
QUERY_LOGGING=true npm run dev
```

### Database Debugging

```sql
-- Check active connections
SELECT * FROM pg_stat_activity;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE tablename = 'analysis_results';

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM analysis_results 
WHERE user_id = '123' AND created_at > NOW() - INTERVAL '1 day';
```

### API Debugging Tools

```bash
# Test endpoints with curl
curl -X POST http://localhost:3000/api/analysis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"verse_range": "John 3:16", "translation": "ESV"}' \
  -v

# Use httpie for cleaner output
http POST localhost:3000/api/analysis \
  Authorization:"Bearer <token>" \
  verse_range="John 3:16" \
  translation="ESV"
```

## Getting Help

If you're still experiencing issues:

1. **Check the logs**: Always start with application and container logs
2. **Search GitHub issues**: Look for similar problems
3. **Enable debug mode**: Use debug flags to get more information
4. **Test in isolation**: Isolate the problem to a specific component
5. **Ask for help**: Contact the development team

### Contact Information

- 📧 **Email**: dev-support@deeperbible.com
- 💬 **Discord**: [Developer Channel](https://discord.gg/deeperbible-dev)
- 📖 **Documentation**: [Full Docs](https://docs.deeperbible.com)
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-org/deeper-bible/issues)

---

**Remember**: When reporting issues, always include:
- Error messages (full stack traces)
- Steps to reproduce
- Environment information (OS, Node version, etc.)
- Relevant configuration (sanitized, no secrets)