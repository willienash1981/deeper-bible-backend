# Deeper Bible API - Deployment Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Local Development](#local-development)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Deployment to Render](#deployment-to-render)
7. [Environment Configuration](#environment-configuration)
8. [Database Migrations](#database-migrations)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Rollback Procedures](#rollback-procedures)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

## Overview

The Deeper Bible API is containerized using Docker and deployed on Render.com with automated CI/CD through GitHub Actions. This documentation covers the complete deployment lifecycle from local development to production.

### Key Features
- **Multi-stage Docker builds** for optimized image size (<100MB)
- **Zero-downtime deployments** with health checks
- **Automatic rollback** on deployment failures
- **Comprehensive monitoring** with Prometheus and Grafana
- **Database migration automation** with backup/restore capabilities

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     GitHub Repository                    │
│                  (deeper-bible-backend)                  │
└────────────────────────┬────────────────────────────────┘
                         │
                    GitHub Actions
                         │
            ┌────────────┴────────────┐
            │                         │
        Build & Test            Deploy to Render
            │                         │
    ┌───────┴────────┐     ┌─────────┴──────────┐
    │  Docker Image  │     │   Render Services   │
    │   (<100MB)     │     │                     │
    └────────────────┘     │  - Web Service      │
                           │  - Worker Service   │
                           │  - PostgreSQL DB    │
                           │  - Redis Cache      │
                           └─────────────────────┘
```

## Prerequisites

### Required Tools
- Docker 20.10+ and Docker Compose 2.0+
- Node.js 20+ and npm 9+
- PostgreSQL client tools
- Git
- Render CLI (optional)

### Required Accounts
- GitHub account with repository access
- Render.com account with API key
- Docker Hub or GitHub Container Registry access

### Environment Setup
```bash
# Clone the repository
git clone https://github.com/your-org/deeper-bible-backend.git
cd deeper-bible-backend

# Copy environment template
cp .env.example .env

# Install dependencies
npm install
```

## Local Development

### Starting the Development Environment

```bash
# Start all services with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Or start specific services
docker-compose -f docker-compose.dev.yml up postgres redis

# View logs
docker-compose -f docker-compose.dev.yml logs -f app

# Stop services
docker-compose -f docker-compose.dev.yml down
```

### Building the Docker Image

```bash
# Build production image
docker build -t deeper-bible-api:latest .

# Build development image
docker build -f Dockerfile.dev -t deeper-bible-api:dev .

# Test the built image
docker run -p 3000:3000 --env-file .env deeper-bible-api:latest
```

### Running Tests in Docker

```bash
# Run unit tests
docker-compose -f docker-compose.dev.yml run --rm app npm test

# Run integration tests
docker-compose -f docker-compose.dev.yml run --rm app npm run test:e2e

# Run with coverage
docker-compose -f docker-compose.dev.yml run --rm app npm run test:coverage
```

## CI/CD Pipeline

### GitHub Actions Workflow

The CI/CD pipeline is defined in `.github/workflows/ci-cd.yml` and includes:

1. **Code Quality Checks**
   - Linting
   - Type checking
   - Security scanning

2. **Testing**
   - Unit tests with coverage
   - Integration tests
   - E2E tests

3. **Building**
   - Multi-platform Docker builds (amd64, arm64)
   - Image optimization
   - Push to registry

4. **Deployment**
   - Automatic deployment to staging (develop branch)
   - Automatic deployment to production (main branch)
   - Health checks and rollback

### Triggering Deployments

```bash
# Deploy to staging
git checkout develop
git merge feature/your-feature
git push origin develop

# Deploy to production
git checkout main
git merge develop
git push origin main

# Manual deployment trigger
gh workflow run ci-cd.yml --ref main
```

## Deployment to Render

### Initial Setup

1. **Create Render Services**
   ```bash
   # Deploy using render.yaml
   render up
   ```

2. **Configure Environment Variables**
   - Go to Render Dashboard
   - Select your service
   - Navigate to Environment tab
   - Add required variables from `.env.example`

3. **Set Up Custom Domain**
   - Add custom domain in Render settings
   - Update DNS records
   - Enable SSL certificate

### Manual Deployment

```bash
# Deploy using Render CLI
render deploy --service deeper-bible-api

# Or trigger via API
curl -X POST \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys"
```

### Deployment Verification

```bash
# Run health check
./scripts/deployment/health-check.sh

# Check deployment status
curl https://api.deeperbible.com/health

# View deployment logs
render logs --service deeper-bible-api --tail
```

## Environment Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| NODE_ENV | Environment (development/staging/production) | Yes | development |
| PORT | Application port | Yes | 3000 |
| DATABASE_URL | PostgreSQL connection string | Yes | - |
| REDIS_URL | Redis connection string | Yes | - |
| JWT_SECRET | JWT signing secret | Yes | - |
| OPENAI_API_KEY | OpenAI API key | Yes | - |
| GOOGLE_CLIENT_ID | Google OAuth client ID | No | - |
| LOG_LEVEL | Logging level | No | info |

### Configuration Files

```bash
# Development
.env.development

# Testing
.env.test

# Production (managed in Render)
# Set via Render dashboard or CLI
```

## Database Migrations

### Running Migrations

```bash
# Run pending migrations
./scripts/deployment/migrate.sh migrate

# Create new migration
./scripts/deployment/migrate.sh generate add_user_preferences

# Check migration status
./scripts/deployment/migrate.sh verify

# Create backup
./scripts/deployment/migrate.sh backup
```

### Rollback Procedures

```bash
# Rollback to specific backup
./scripts/deployment/migrate.sh rollback backup_20240101_120000.sql

# Automatic rollback on failure
# This happens automatically if migration fails
```

### Migration Best Practices

1. Always test migrations in staging first
2. Create backups before running migrations
3. Use transactions for DDL operations
4. Avoid breaking changes when possible
5. Document migration side effects

## Monitoring & Alerting

### Prometheus Metrics

The application exposes metrics at `/metrics` endpoint:

```bash
# View metrics
curl http://localhost:3000/metrics

# Key metrics:
# - http_requests_total
# - http_request_duration_seconds
# - database_connections_active
# - cache_hits_total
```

### Setting Up Monitoring

```bash
# Start Prometheus
docker run -d \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# Start Grafana
docker run -d \
  -p 3001:3000 \
  grafana/grafana

# Import dashboard
# Use monitoring/grafana-dashboard.json
```

### Alert Configuration

Alerts are defined in `monitoring/alerts.yml`:

- High error rate (>5% 5xx errors)
- API down (health check failure)
- High response time (>2s p95)
- Database connection issues
- High memory/CPU usage
- SSL certificate expiry

### Alert Channels

Configure in Render or your monitoring system:
- Email notifications
- Slack webhooks
- PagerDuty integration
- Custom webhooks

## Rollback Procedures

### Automatic Rollback

Triggered automatically when:
- Health checks fail after deployment
- Error rate exceeds threshold
- Critical alerts fire

### Manual Rollback

```bash
# Rollback to previous version
./scripts/deployment/rollback.sh auto

# Rollback to specific commit
./scripts/deployment/rollback.sh commit abc123def

# Rollback to specific version
./scripts/deployment/rollback.sh version v1.2.3

# Full rollback (app + database)
./scripts/deployment/rollback.sh full
```

### Rollback Verification

```bash
# Verify rollback success
./scripts/deployment/health-check.sh

# Check application version
curl https://api.deeperbible.com/version

# Review logs
render logs --service deeper-bible-api --since 1h
```

## Troubleshooting

### Common Issues

#### 1. Docker Build Failures

```bash
# Clear Docker cache
docker system prune -a

# Build with no cache
docker build --no-cache -t deeper-bible-api .

# Check build logs
docker build --progress=plain -t deeper-bible-api .
```

#### 2. Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check connection pool
curl http://localhost:3000/health/db

# Review database logs
docker-compose logs postgres
```

#### 3. Deployment Failures

```bash
# Check deployment status
render status --service deeper-bible-api

# View deployment logs
render logs --service deeper-bible-api --tail 100

# Trigger manual deployment
render deploy --service deeper-bible-api
```

#### 4. Performance Issues

```bash
# Check resource usage
docker stats

# Profile application
NODE_OPTIONS="--inspect=0.0.0.0:9229" npm run dev

# Check slow queries
psql $DATABASE_URL -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10"
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=deeper-bible:*
export LOG_LEVEL=debug

# Run with verbose output
npm run dev -- --verbose

# Enable SQL query logging
export LOG_SQL=true
```

## Security Considerations

### Security Checklist

- [ ] All secrets in environment variables
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented
- [ ] Security headers configured (Helmet.js)
- [ ] Dependencies regularly updated
- [ ] Security scanning in CI/CD

### Secret Management

```bash
# Never commit secrets
# Add to .gitignore
.env
.env.*
!.env.example

# Rotate secrets regularly
render env:set JWT_SECRET="new_secret_value"

# Use strong secrets
openssl rand -base64 32
```

### Security Monitoring

- Enable audit logging
- Monitor failed authentication attempts
- Set up intrusion detection
- Regular security audits
- Dependency vulnerability scanning

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check disk space
- Review security alerts

**Weekly:**
- Update dependencies
- Review performance metrics
- Test backup restoration

**Monthly:**
- Security audit
- Performance optimization
- Documentation updates

**Quarterly:**
- Major version updates
- Architecture review
- Disaster recovery drill

### Health Endpoints

```bash
# Basic health check
GET /health

# Detailed health check
GET /health/detailed

# Database health
GET /health/db

# Redis health
GET /health/redis

# Readiness probe
GET /ready

# Liveness probe
GET /alive
```

## Support

For issues or questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review application logs
3. Check monitoring dashboards
4. Contact the DevOps team
5. Create a GitHub issue

---

**Last Updated:** 2024
**Version:** 1.0.0
**Maintained by:** DevOps Team