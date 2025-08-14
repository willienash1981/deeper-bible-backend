# Operations Guide

Comprehensive guide for deploying, monitoring, and maintaining the Deeper Bible Backend API in production environments.

## 📋 Table of Contents

- [Deployment Procedures](#deployment-procedures)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Backup and Recovery](#backup-and-recovery)
- [Performance Tuning](#performance-tuning)
- [Security Procedures](#security-procedures)
- [Maintenance Tasks](#maintenance-tasks)
- [Incident Response](#incident-response)

## Deployment Procedures

### Production Environment

#### Render.com Deployment (Recommended)

```yaml
# render.yaml
services:
  - type: web
    name: deeper-bible-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    plan: standard
    autoDeploy: false
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: deeper-bible-db
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: deeper-bible-redis
          type: redis
          property: connectionString

databases:
  - name: deeper-bible-db
    databaseName: deeper_bible
    plan: standard

redis:
  - name: deeper-bible-redis
    plan: standard
    maxmemoryPolicy: allkeys-lru
```

#### Deploy Commands

```bash
# Production deployment
render up

# Deploy specific service
render deploy --service deeper-bible-api

# Check deployment status
render status deeper-bible-api

# View logs
render logs deeper-bible-api --tail
```

### Staging Environment

```bash
# Deploy to staging
git push origin develop

# Manual staging deploy
render deploy --service deeper-bible-api-staging
```

### Environment Configuration

#### Production Environment Variables

```env
# Application
NODE_ENV=production
PORT=80
API_BASE_URL=https://api.deeperbible.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/deeper_bible
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=10000

# Redis
REDIS_URL=redis://user:pass@host:6379
REDIS_POOL_SIZE=10
REDIS_TTL=3600

# JWT
JWT_SECRET=your-super-secure-secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# OpenAI
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=4096
OPENAI_TIMEOUT=30000

# Pinecone
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=production
PINECONE_INDEX_NAME=deeper-bible-prod

# Monitoring
PROMETHEUS_ENABLED=true
GRAFANA_URL=https://grafana.deeperbible.com
SENTRY_DSN=your-sentry-dsn

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
CLOUDWATCH_LOG_GROUP=deeper-bible-api
```

### Deployment Checklist

#### Pre-Deployment
- [ ] All tests pass (`npm run test:ci`)
- [ ] Security scan complete
- [ ] Database migrations ready
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Backup completed

#### During Deployment
- [ ] Health checks passing
- [ ] Database migrations applied
- [ ] Cache cleared/warmed
- [ ] Monitoring active
- [ ] Error rates normal

#### Post-Deployment
- [ ] Smoke tests pass
- [ ] Performance metrics normal
- [ ] User acceptance testing
- [ ] Documentation updated
- [ ] Team notified

### Rollback Procedures

```bash
# Automatic rollback (if health checks fail)
# Render.com handles this automatically

# Manual rollback to previous version
render rollback deeper-bible-api --to-deploy <deploy-id>

# Emergency rollback
git revert <commit-hash>
git push origin main
render deploy --service deeper-bible-api
```

## Monitoring and Alerting

### Prometheus Metrics

#### Application Metrics

```typescript
// Custom metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status_code']
});

const analysisRequestDuration = new promClient.Histogram({
  name: 'analysis_request_duration_seconds',
  help: 'Analysis request duration',
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const openaiApiCalls = new promClient.Counter({
  name: 'openai_api_calls_total',
  help: 'Total OpenAI API calls',
  labelNames: ['model', 'status']
});
```

#### Infrastructure Metrics

```yaml
# Prometheus config
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'deeper-bible-api'
    static_configs:
      - targets: ['api.deeperbible.com:3000']
    metrics_path: /metrics
    scrape_interval: 10s

  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Grafana Dashboards

#### API Dashboard

```json
{
  "dashboard": {
    "title": "Deeper Bible API",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ]
      },
      {
        "title": "Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status_code=~\"5..\"}[5m])"
          }
        ]
      }
    ]
  }
}
```

### Alert Rules

#### Prometheus Alerts

```yaml
groups:
  - name: deeper-bible-api
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.1
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors per second"

      - alert: DatabaseConnectionFailure
        expr: up{job="postgres-exporter"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection failed"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is {{ $value }}s"

      - alert: OpenAIQuotaExceeded
        expr: increase(openai_api_calls_total{status="429"}[1h]) > 10
        for: 0m
        labels:
          severity: warning
        annotations:
          summary: "OpenAI quota exceeded"
```

### Notification Channels

#### Slack Integration

```typescript
// Slack webhook configuration
const slackNotifier = {
  webhook: process.env.SLACK_WEBHOOK_URL,
  channel: '#alerts',
  username: 'Deeper Bible Monitor',
  
  async sendAlert(alert: Alert) {
    const message = {
      text: `🚨 ${alert.severity.toUpperCase()}: ${alert.summary}`,
      attachments: [{
        color: alert.severity === 'critical' ? 'danger' : 'warning',
        fields: [
          { title: 'Service', value: 'Deeper Bible API', short: true },
          { title: 'Environment', value: process.env.NODE_ENV, short: true },
          { title: 'Description', value: alert.description, short: false }
        ],
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await fetch(this.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  }
};
```

#### PagerDuty Integration

```typescript
const pagerDutyNotifier = {
  integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
  
  async sendAlert(alert: Alert) {
    const event = {
      routing_key: this.integrationKey,
      event_action: 'trigger',
      payload: {
        summary: alert.summary,
        source: 'Deeper Bible API',
        severity: alert.severity,
        component: 'api',
        group: 'backend',
        class: 'performance'
      }
    };
    
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event)
    });
  }
};
```

## Backup and Recovery

### Database Backups

#### Automated Backups

```bash
#!/bin/bash
# scripts/backup-database.sh

DB_NAME="deeper_bible"
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"

# Create backup directory
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Upload to S3
aws s3 cp ${BACKUP_FILE}.gz s3://deeper-bible-backups/database/

# Keep only last 7 days locally
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: ${BACKUP_FILE}.gz"
```

#### Scheduled Backups

```yaml
# .github/workflows/backup.yml
name: Database Backup
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Backup Database
        run: ./scripts/backup-database.sh
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Recovery Procedures

#### Database Recovery

```bash
#!/bin/bash
# scripts/restore-database.sh

BACKUP_FILE=$1
DB_NAME="deeper_bible"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# Stop application
render scale deeper-bible-api --replicas 0

# Drop existing database (WARNING!)
dropdb $DB_NAME

# Create new database
createdb $DB_NAME

# Restore from backup
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE | psql $DATABASE_URL
else
  psql $DATABASE_URL < $BACKUP_FILE
fi

# Restart application
render scale deeper-bible-api --replicas 1

echo "Database restored from: $BACKUP_FILE"
```

#### Point-in-Time Recovery

```bash
# For PostgreSQL with WAL-E or similar
wal-e backup-fetch /tmp/recover LATEST
pg_ctl -D /tmp/recover start
```

### Redis Backups

```bash
#!/bin/bash
# scripts/backup-redis.sh

REDIS_HOST="your-redis-host"
REDIS_PORT="6379"
BACKUP_DIR="/backups/redis"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
redis-cli -h $REDIS_HOST -p $REDIS_PORT --rdb $BACKUP_DIR/dump_${DATE}.rdb

# Upload to S3
aws s3 cp $BACKUP_DIR/dump_${DATE}.rdb s3://deeper-bible-backups/redis/

# Cleanup old backups
find $BACKUP_DIR -name "dump_*.rdb" -mtime +3 -delete
```

## Performance Tuning

### Database Optimization

#### Connection Pooling

```typescript
// Database connection pool configuration
const dbConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  pool: {
    min: 2,
    max: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
    idle: 10000,
    acquire: 60000,
    evict: 1000
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
};
```

#### Query Optimization

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_analysis_user_created 
ON analysis_results(user_id, created_at);

CREATE INDEX CONCURRENTLY idx_analysis_verse_range 
ON analysis_results USING gin(verse_range gin_trgm_ops);

-- Optimize expensive queries
EXPLAIN ANALYZE SELECT * FROM analysis_results 
WHERE user_id = $1 
ORDER BY created_at DESC 
LIMIT 20;
```

### Redis Optimization

```redis
# Redis configuration
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000

# Monitor performance
redis-cli info stats
redis-cli slowlog get 10
```

### Application Performance

#### Node.js Optimization

```typescript
// Express.js performance settings
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Memory management
process.env.NODE_OPTIONS = '--max-old-space-size=4096';

// Cluster mode for production
if (process.env.NODE_ENV === 'production') {
  const cluster = require('cluster');
  const numCPUs = require('os').cpus().length;
  
  if (cluster.isMaster) {
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }
  } else {
    require('./app');
  }
}
```

#### Caching Strategy

```typescript
// Multi-level caching
class CacheService {
  private redis: Redis;
  private localCache: Map<string, any> = new Map();
  
  async get(key: string): Promise<any> {
    // L1: Local memory cache
    if (this.localCache.has(key)) {
      return this.localCache.get(key);
    }
    
    // L2: Redis cache
    const redisValue = await this.redis.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      this.localCache.set(key, parsed);
      return parsed;
    }
    
    return null;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Store in both caches
    this.localCache.set(key, value);
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }
}
```

## Security Procedures

### SSL/TLS Configuration

```nginx
# Nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name api.deeperbible.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Security Headers

```typescript
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Rate limiting per IP
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests from this IP'
  }
}));
```

### Secrets Management

```bash
# Using AWS Secrets Manager
aws secretsmanager create-secret \
  --name deeper-bible/production \
  --description "Production secrets for Deeper Bible API" \
  --secret-string '{
    "DATABASE_URL": "postgresql://...",
    "JWT_SECRET": "...",
    "OPENAI_API_KEY": "..."
  }'

# Retrieve secrets in application
aws secretsmanager get-secret-value \
  --secret-id deeper-bible/production \
  --query SecretString --output text
```

### Security Auditing

```bash
# Regular security checks
npm audit --audit-level high

# Docker security scan
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image deeper-bible-api:latest

# OWASP dependency check
./scripts/security-audit.sh
```

## Maintenance Tasks

### Daily Tasks

```bash
#!/bin/bash
# scripts/daily-maintenance.sh

# Check service health
curl -f http://localhost:3000/api/health || exit 1

# Verify database connections
psql $DATABASE_URL -c "SELECT 1;" || exit 1

# Check Redis
redis-cli ping || exit 1

# Review error logs
tail -n 100 logs/error.log

# Check disk space
df -h

# Monitor API performance
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health
```

### Weekly Tasks

```bash
#!/bin/bash
# scripts/weekly-maintenance.sh

# Update dependencies
npm audit fix

# Analyze slow queries
psql $DATABASE_URL -f scripts/analyze-slow-queries.sql

# Clean up old logs
find logs/ -name "*.log" -mtime +7 -delete

# Review and rotate SSL certificates
certbot renew --dry-run

# Generate weekly performance report
node scripts/generate-performance-report.js
```

### Monthly Tasks

```bash
#!/bin/bash
# scripts/monthly-maintenance.sh

# Full security audit
npm audit --audit-level moderate

# Database maintenance
psql $DATABASE_URL -c "VACUUM ANALYZE;"

# Review and update monitoring alerts
node scripts/validate-alerts.js

# Update documentation
git log --since="1 month ago" --oneline > monthly-changes.txt

# Cost optimization review
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-02-01
```

## Incident Response

### Incident Classification

#### Severity Levels

- **P0 (Critical)**: Service completely down, data loss risk
- **P1 (High)**: Major functionality impaired, significant user impact  
- **P2 (Medium)**: Minor functionality impaired, workaround available
- **P3 (Low)**: Cosmetic issues, minimal user impact

### Response Procedures

#### P0/P1 Incidents

1. **Immediate Response (0-15 minutes)**
   ```bash
   # Check service status
   curl -f https://api.deeperbible.com/health
   
   # Check recent deployments
   render deployments deeper-bible-api --limit 5
   
   # Review error logs
   render logs deeper-bible-api --tail --lines 100
   
   # Notify team
   slack-notify "#incidents" "P1 incident detected"
   ```

2. **Investigation (15-30 minutes)**
   - Gather metrics and logs
   - Identify root cause
   - Assess user impact
   - Determine fix strategy

3. **Resolution (30+ minutes)**
   - Implement fix or rollback
   - Verify resolution
   - Update status page
   - Notify stakeholders

### Post-Incident Review

```markdown
# Incident Report Template

## Summary
- **Date**: YYYY-MM-DD
- **Duration**: X hours Y minutes
- **Severity**: P1
- **Impact**: X% of users affected

## Root Cause
Detailed explanation of what caused the incident.

## Timeline
- HH:MM - Incident detected
- HH:MM - Investigation started  
- HH:MM - Root cause identified
- HH:MM - Fix implemented
- HH:MM - Resolution confirmed

## Resolution
What was done to resolve the incident.

## Action Items
- [ ] Fix root cause
- [ ] Add monitoring
- [ ] Update runbooks
- [ ] Team training
```

## Runbooks

### Common Scenarios

#### High CPU Usage
```bash
# Check process usage
top -p $(pgrep -f "node.*server.js")

# Check for memory leaks
kill -USR2 $(pgrep -f "node.*server.js")
ls -la *.heapsnapshot

# Scale horizontally if needed
render scale deeper-bible-api --replicas 3
```

#### Database Connection Issues
```bash
# Check active connections
psql $DATABASE_URL -c "
  SELECT pid, usename, state, query_start, query 
  FROM pg_stat_activity 
  WHERE state != 'idle';"

# Kill long-running queries
psql $DATABASE_URL -c "
  SELECT pg_terminate_backend(pid) 
  FROM pg_stat_activity 
  WHERE query_start < NOW() - INTERVAL '5 minutes';"
```

#### Redis Memory Issues
```bash
# Check memory usage
redis-cli info memory

# Clear cache if needed
redis-cli flushall

# Restart Redis
docker-compose restart redis
```

---

**Emergency Contacts:**
- **On-call Engineer**: +1-XXX-XXX-XXXX
- **DevOps Lead**: engineer@deeperbible.com  
- **CTO**: cto@deeperbible.com

**Status Page**: https://status.deeperbible.com
**Monitoring Dashboard**: https://grafana.deeperbible.com