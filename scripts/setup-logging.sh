#!/bin/bash

# Centralized Logging Setup Script for Deeper Bible API
# Sets up ELK stack with proper configurations and dashboards

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ELASTICSEARCH_URL="http://localhost:9200"
KIBANA_URL="http://localhost:5601"
LOG_DIR="./logs"

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "info")
            echo -e "${BLUE}ℹ${NC} $message"
            ;;
        "success")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "error")
            echo -e "${RED}✗${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
    esac
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local service_url=$2
    local max_attempts=30
    local attempt=0
    
    print_status "info" "Waiting for $service_name to be ready..."
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "$service_url" >/dev/null 2>&1; then
            print_status "success" "$service_name is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 10
    done
    
    print_status "error" "$service_name failed to start within timeout"
    return 1
}

# Function to create log directory
setup_log_directory() {
    print_status "info" "Setting up log directory..."
    
    mkdir -p "$LOG_DIR"
    chmod 755 "$LOG_DIR"
    
    # Create log rotation configuration
    cat > "$LOG_DIR/logrotate.conf" << 'EOF'
/app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        /usr/bin/docker-compose -f docker-compose.logging.yml exec filebeat /usr/share/filebeat/filebeat -c /usr/share/filebeat/filebeat.yml -e &
    endscript
}
EOF
    
    print_status "success" "Log directory configured"
}

# Function to start ELK stack
start_elk_stack() {
    print_status "info" "Starting ELK stack..."
    
    # Check if Docker Compose file exists
    if [ ! -f "docker-compose.logging.yml" ]; then
        print_status "error" "docker-compose.logging.yml not found"
        return 1
    fi
    
    # Start the stack
    docker-compose -f docker-compose.logging.yml up -d
    
    # Wait for services to be ready
    wait_for_service "Elasticsearch" "$ELASTICSEARCH_URL/_cluster/health"
    wait_for_service "Kibana" "$KIBANA_URL/api/status"
    
    print_status "success" "ELK stack started successfully"
}

# Function to create Elasticsearch index templates
create_index_templates() {
    print_status "info" "Creating Elasticsearch index templates..."
    
    # Main application logs template
    curl -X PUT "$ELASTICSEARCH_URL/_index_template/deeper-bible-logs" \
        -H "Content-Type: application/json" \
        -d '{
            "index_patterns": ["deeper-bible-logs-*"],
            "template": {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0,
                    "index.lifecycle.name": "deeper-bible-logs-policy",
                    "index.lifecycle.rollover_alias": "deeper-bible-logs"
                },
                "mappings": {
                    "properties": {
                        "@timestamp": {"type": "date"},
                        "level": {"type": "keyword"},
                        "message": {"type": "text"},
                        "service": {"type": "keyword"},
                        "environment": {"type": "keyword"},
                        "container_name": {"type": "keyword"},
                        "http_method": {"type": "keyword"},
                        "endpoint": {"type": "keyword"},
                        "status_code": {"type": "integer"},
                        "response_time": {"type": "float"},
                        "client_ip": {"type": "ip"},
                        "user_id": {"type": "keyword"},
                        "error_message": {"type": "text"},
                        "stack_trace": {"type": "text"},
                        "severity": {"type": "keyword"}
                    }
                }
            },
            "priority": 500,
            "version": 1
        }' >/dev/null 2>&1
    
    # API requests template
    curl -X PUT "$ELASTICSEARCH_URL/_index_template/deeper-bible-api-requests" \
        -H "Content-Type: application/json" \
        -d '{
            "index_patterns": ["deeper-bible-api-requests-*"],
            "template": {
                "settings": {
                    "number_of_shards": 1,
                    "number_of_replicas": 0
                },
                "mappings": {
                    "properties": {
                        "@timestamp": {"type": "date"},
                        "http_method": {"type": "keyword"},
                        "endpoint": {"type": "keyword"},
                        "status_code": {"type": "integer"},
                        "response_time": {"type": "float"},
                        "client_ip": {"type": "ip"},
                        "user_agent": {"type": "text"},
                        "user_id": {"type": "keyword"}
                    }
                }
            },
            "priority": 600
        }' >/dev/null 2>&1
    
    print_status "success" "Index templates created"
}

# Function to create index lifecycle policy
create_lifecycle_policy() {
    print_status "info" "Creating index lifecycle policy..."
    
    curl -X PUT "$ELASTICSEARCH_URL/_ilm/policy/deeper-bible-logs-policy" \
        -H "Content-Type: application/json" \
        -d '{
            "policy": {
                "phases": {
                    "hot": {
                        "actions": {
                            "rollover": {
                                "max_size": "10GB",
                                "max_age": "7d"
                            }
                        }
                    },
                    "warm": {
                        "min_age": "7d",
                        "actions": {
                            "allocate": {
                                "number_of_replicas": 0
                            }
                        }
                    },
                    "delete": {
                        "min_age": "30d"
                    }
                }
            }
        }' >/dev/null 2>&1
    
    print_status "success" "Index lifecycle policy created"
}

# Function to import Kibana dashboards
import_kibana_dashboards() {
    print_status "info" "Importing Kibana dashboards..."
    
    # Create index patterns
    curl -X POST "$KIBANA_URL/api/saved_objects/index-pattern" \
        -H "Content-Type: application/json" \
        -H "kbn-xsrf: true" \
        -d '{
            "attributes": {
                "title": "deeper-bible-logs-*",
                "timeFieldName": "@timestamp"
            }
        }' >/dev/null 2>&1
    
    curl -X POST "$KIBANA_URL/api/saved_objects/index-pattern" \
        -H "Content-Type: application/json" \
        -H "kbn-xsrf: true" \
        -d '{
            "attributes": {
                "title": "deeper-bible-api-requests-*",
                "timeFieldName": "@timestamp"
            }
        }' >/dev/null 2>&1
    
    # Import pre-built dashboards (this would typically be from exported JSON)
    print_status "info" "Creating sample dashboard..."
    
    # Create a sample dashboard
    curl -X POST "$KIBANA_URL/api/saved_objects/dashboard" \
        -H "Content-Type: application/json" \
        -H "kbn-xsrf: true" \
        -d '{
            "attributes": {
                "title": "Deeper Bible API Overview",
                "description": "Main dashboard for API monitoring and logging",
                "panelsJSON": "[]",
                "version": 1,
                "timeRestore": true,
                "timeTo": "now",
                "timeFrom": "now-24h"
            }
        }' >/dev/null 2>&1
    
    print_status "success" "Kibana dashboards imported"
}

# Function to setup log forwarding for application
setup_app_logging() {
    print_status "info" "Setting up application log forwarding..."
    
    # Create Winston logger configuration for the app
    cat > "./src/config/logger.ts" << 'EOF'
import winston from 'winston';
import path from 'path';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Create custom format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, service = 'deeper-bible-api', ...meta } = info;
    
    return JSON.stringify({
      '@timestamp': timestamp,
      level,
      message,
      service,
      environment: process.env.NODE_ENV || 'development',
      ...meta,
    });
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: logFormat,
  defaultMeta: {
    service: 'deeper-bible-api',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      ),
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'app.log'),
      maxsize: 50 * 1024 * 1024, // 50MB
      maxFiles: 5,
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // HTTP transport to Logstash (if enabled)
    ...(process.env.LOGSTASH_HOST ? [
      new winston.transports.Http({
        host: process.env.LOGSTASH_HOST.split(':')[0] || 'localhost',
        port: parseInt(process.env.LOGSTASH_HOST.split(':')[1]) || 5000,
        path: '/',
      })
    ] : []),
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'exceptions.log'),
    }),
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.env.LOG_DIR || './logs', 'rejections.log'),
    }),
  ],
});

export default logger;
EOF
    
    print_status "success" "Application logging configuration created"
}

# Function to create monitoring scripts
create_monitoring_scripts() {
    print_status "info" "Creating log monitoring scripts..."
    
    # Log monitoring script
    cat > "./scripts/monitor-logs.sh" << 'EOF'
#!/bin/bash

# Simple log monitoring script
LOG_DIR=${1:-"./logs"}
ALERT_KEYWORDS=${2:-"ERROR|FATAL|CRITICAL"}

echo "Monitoring logs in $LOG_DIR for keywords: $ALERT_KEYWORDS"

tail -f "$LOG_DIR"/*.log | while read line; do
    if echo "$line" | grep -E "$ALERT_KEYWORDS" >/dev/null; then
        echo "ALERT: $line"
        # Send alert notification here
        # curl -X POST "$SLACK_WEBHOOK" -d "{\"text\":\"Log Alert: $line\"}"
    fi
done
EOF
    
    chmod +x "./scripts/monitor-logs.sh"
    
    # Log analysis script
    cat > "./scripts/analyze-logs.sh" << 'EOF'
#!/bin/bash

# Log analysis script
LOG_FILE=${1:-"./logs/app.log"}
TIME_RANGE=${2:-"1h"}

echo "Analyzing logs from $LOG_FILE for the last $TIME_RANGE"

# Count log levels
echo "=== Log Level Summary ==="
grep -o '"level":"[^"]*"' "$LOG_FILE" | sort | uniq -c | sort -nr

# Find most common errors
echo "=== Top Errors ==="
grep '"level":"error"' "$LOG_FILE" | grep -o '"message":"[^"]*"' | sort | uniq -c | sort -nr | head -10

# API endpoint statistics
echo "=== API Endpoint Statistics ==="
grep '"endpoint":"' "$LOG_FILE" | grep -o '"endpoint":"[^"]*"' | sort | uniq -c | sort -nr | head -10
EOF
    
    chmod +x "./scripts/analyze-logs.sh"
    
    print_status "success" "Monitoring scripts created"
}

# Function to test logging setup
test_logging() {
    print_status "info" "Testing logging setup..."
    
    # Test Elasticsearch
    if curl -f -s "$ELASTICSEARCH_URL/_cluster/health" >/dev/null; then
        print_status "success" "Elasticsearch is responding"
    else
        print_status "error" "Elasticsearch is not responding"
        return 1
    fi
    
    # Test Kibana
    if curl -f -s "$KIBANA_URL/api/status" >/dev/null; then
        print_status "success" "Kibana is responding"
    else
        print_status "error" "Kibana is not responding"
        return 1
    fi
    
    # Create test log entry
    echo '{"@timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'","level":"info","message":"Test log entry from setup script","service":"deeper-bible-api","environment":"test"}' >> "$LOG_DIR/app.log"
    
    print_status "success" "Test log entry created"
    print_status "info" "Visit $KIBANA_URL to view logs and dashboards"
}

# Main function
main() {
    echo "================================================"
    echo "Deeper Bible API Centralized Logging Setup"
    echo "================================================"
    echo
    
    case ${1:-"setup"} in
        "setup")
            setup_log_directory
            start_elk_stack
            sleep 30 # Give services time to fully start
            create_index_templates
            create_lifecycle_policy
            import_kibana_dashboards
            setup_app_logging
            create_monitoring_scripts
            test_logging
            
            print_status "success" "Centralized logging setup complete!"
            echo
            echo "Access URLs:"
            echo "  Elasticsearch: $ELASTICSEARCH_URL"
            echo "  Kibana: $KIBANA_URL"
            echo "  Logs directory: $LOG_DIR"
            ;;
            
        "start")
            start_elk_stack
            ;;
            
        "stop")
            print_status "info" "Stopping ELK stack..."
            docker-compose -f docker-compose.logging.yml down
            print_status "success" "ELK stack stopped"
            ;;
            
        "restart")
            print_status "info" "Restarting ELK stack..."
            docker-compose -f docker-compose.logging.yml restart
            print_status "success" "ELK stack restarted"
            ;;
            
        "test")
            test_logging
            ;;
            
        *)
            echo "Usage: $0 {setup|start|stop|restart|test}"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"