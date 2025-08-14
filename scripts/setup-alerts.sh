#!/bin/bash

# Alert Notification Setup Script for Deeper Bible API
# This script helps configure alert notification channels

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Function to setup Slack notifications
setup_slack() {
    print_status "info" "Setting up Slack notifications..."
    
    echo "Please provide your Slack webhook URL:"
    read -r SLACK_WEBHOOK
    
    if [ -z "$SLACK_WEBHOOK" ]; then
        print_status "error" "Slack webhook URL is required"
        return 1
    fi
    
    # Create secrets directory
    mkdir -p ./monitoring/secrets
    
    # Store Slack webhook
    echo "$SLACK_WEBHOOK" > ./monitoring/secrets/slack_webhook
    chmod 600 ./monitoring/secrets/slack_webhook
    
    print_status "success" "Slack webhook configured"
}

# Function to setup email notifications
setup_email() {
    print_status "info" "Setting up email notifications..."
    
    echo "SMTP Server (e.g., smtp.gmail.com:587):"
    read -r SMTP_SERVER
    
    echo "SMTP Username:"
    read -r SMTP_USERNAME
    
    echo "SMTP Password:"
    read -s SMTP_PASSWORD
    echo
    
    echo "Alert recipient email:"
    read -r ALERT_EMAIL
    
    # Create secrets directory
    mkdir -p ./monitoring/secrets
    
    # Store email configuration
    echo "$SMTP_PASSWORD" > ./monitoring/secrets/smtp_password
    chmod 600 ./monitoring/secrets/smtp_password
    
    # Update alertmanager configuration
    sed -i.bak "s/localhost:587/$SMTP_SERVER/g" ./monitoring/alertmanager.yml
    sed -i.bak "s/alerts@deeperbible.com/$SMTP_USERNAME/g" ./monitoring/alertmanager.yml
    sed -i.bak "s/devops@deeperbible.com/$ALERT_EMAIL/g" ./monitoring/alertmanager.yml
    
    print_status "success" "Email notifications configured"
}

# Function to setup PagerDuty
setup_pagerduty() {
    print_status "info" "Setting up PagerDuty notifications..."
    
    echo "PagerDuty Integration Key:"
    read -s PAGERDUTY_KEY
    echo
    
    if [ -z "$PAGERDUTY_KEY" ]; then
        print_status "warning" "PagerDuty key not provided, skipping..."
        return 0
    fi
    
    # Create secrets directory
    mkdir -p ./monitoring/secrets
    
    # Store PagerDuty key
    echo "$PAGERDUTY_KEY" > ./monitoring/secrets/pagerduty_key
    chmod 600 ./monitoring/secrets/pagerduty_key
    
    print_status "success" "PagerDuty notifications configured"
}

# Function to setup webhook notifications
setup_webhook() {
    print_status "info" "Setting up custom webhook notifications..."
    
    echo "Webhook URL:"
    read -r WEBHOOK_URL
    
    if [ -z "$WEBHOOK_URL" ]; then
        print_status "warning" "Webhook URL not provided, skipping..."
        return 0
    fi
    
    # Add webhook configuration to alertmanager
    cat >> ./monitoring/alertmanager.yml << EOF

  # Custom webhook receiver
  - name: 'webhook-alerts'
    webhook_configs:
      - url: '$WEBHOOK_URL'
        send_resolved: true
        http_config:
          basic_auth:
            username: 'webhook_user'
            password_file: '/etc/alertmanager/secrets/webhook_password'
EOF
    
    echo "Webhook password:"
    read -s WEBHOOK_PASSWORD
    echo
    
    # Store webhook password
    mkdir -p ./monitoring/secrets
    echo "$WEBHOOK_PASSWORD" > ./monitoring/secrets/webhook_password
    chmod 600 ./monitoring/secrets/webhook_password
    
    print_status "success" "Webhook notifications configured"
}

# Function to create Render.com environment variables
setup_render_alerts() {
    print_status "info" "Setting up Render.com alert environment variables..."
    
    # Check if render CLI is available
    if ! command -v render &> /dev/null; then
        print_status "warning" "Render CLI not found. Please install it to automatically configure environment variables."
        print_status "info" "Manual setup required in Render dashboard."
        return 0
    fi
    
    # Set environment variables in Render
    if [ -f "./monitoring/secrets/slack_webhook" ]; then
        render env:set SLACK_WEBHOOK_URL="$(cat ./monitoring/secrets/slack_webhook)"
        print_status "success" "Slack webhook configured in Render"
    fi
    
    if [ -f "./monitoring/secrets/smtp_password" ]; then
        render env:set SMTP_PASSWORD="$(cat ./monitoring/secrets/smtp_password)"
        print_status "success" "SMTP password configured in Render"
    fi
    
    if [ -f "./monitoring/secrets/pagerduty_key" ]; then
        render env:set PAGERDUTY_INTEGRATION_KEY="$(cat ./monitoring/secrets/pagerduty_key)"
        print_status "success" "PagerDuty key configured in Render"
    fi
}

# Function to test alert notifications
test_alerts() {
    print_status "info" "Testing alert notifications..."
    
    # Create a test alert
    curl -X POST http://localhost:9093/api/v1/alerts \
        -H "Content-Type: application/json" \
        -d '[
            {
                "labels": {
                    "alertname": "TestAlert",
                    "service": "deeper-bible-api",
                    "severity": "warning",
                    "instance": "test"
                },
                "annotations": {
                    "summary": "Test alert notification",
                    "description": "This is a test alert to verify notification channels are working"
                },
                "generatorURL": "http://localhost:9090/alerts"
            }
        ]' 2>/dev/null || print_status "warning" "Could not send test alert (Alertmanager not running)"
    
    print_status "info" "Test alert sent (if Alertmanager is running)"
}

# Function to create monitoring docker-compose
create_monitoring_compose() {
    print_status "info" "Creating monitoring Docker Compose file..."
    
    cat > docker-compose.monitoring.yml << 'EOF'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: deeper-bible-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
      - '--storage.tsdb.retention.time=30d'
    restart: unless-stopped
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: deeper-bible-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - ./monitoring/secrets:/etc/alertmanager/secrets:ro
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
      - '--web.external-url=http://localhost:9093'
    restart: unless-stopped
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: deeper-bible-grafana
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana-dashboard.json:/etc/grafana/provisioning/dashboards/dashboard.json
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_INSTALL_PLUGINS=grafana-piechart-panel
    restart: unless-stopped
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: deeper-bible-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped
    networks:
      - monitoring

  blackbox-exporter:
    image: prom/blackbox-exporter:latest
    container_name: deeper-bible-blackbox-exporter
    ports:
      - "9115:9115"
    volumes:
      - ./monitoring/blackbox.yml:/etc/blackbox_exporter/config.yml
    restart: unless-stopped
    networks:
      - monitoring

volumes:
  prometheus_data:
  alertmanager_data:
  grafana_data:

networks:
  monitoring:
    driver: bridge
EOF
    
    print_status "success" "Monitoring Docker Compose created"
}

# Function to create blackbox exporter config
create_blackbox_config() {
    print_status "info" "Creating blackbox exporter configuration..."
    
    cat > ./monitoring/blackbox.yml << 'EOF'
modules:
  http_2xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200]
      method: GET
      follow_redirects: true
      preferred_ip_protocol: "ip4"

  http_4xx:
    prober: http
    timeout: 5s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [400, 401, 403, 404]
      method: GET

  tcp_connect:
    prober: tcp
    timeout: 5s

  icmp:
    prober: icmp
    timeout: 5s
    icmp:
      preferred_ip_protocol: "ip4"
EOF
    
    print_status "success" "Blackbox exporter configuration created"
}

# Main function
main() {
    echo "================================================"
    echo "Deeper Bible API Alert Notification Setup"
    echo "================================================"
    echo
    
    print_status "info" "This script will help you configure alert notifications"
    echo
    
    # Create monitoring directory
    mkdir -p ./monitoring/secrets
    
    # Setup notification channels
    while true; do
        echo "Select notification channels to configure:"
        echo "1) Slack"
        echo "2) Email"
        echo "3) PagerDuty"
        echo "4) Custom Webhook"
        echo "5) Create monitoring Docker Compose"
        echo "6) Test notifications"
        echo "7) Setup Render.com environment variables"
        echo "8) Exit"
        echo
        read -p "Enter your choice (1-8): " choice
        
        case $choice in
            1)
                setup_slack
                ;;
            2)
                setup_email
                ;;
            3)
                setup_pagerduty
                ;;
            4)
                setup_webhook
                ;;
            5)
                create_monitoring_compose
                create_blackbox_config
                ;;
            6)
                test_alerts
                ;;
            7)
                setup_render_alerts
                ;;
            8)
                print_status "success" "Alert notification setup complete!"
                exit 0
                ;;
            *)
                print_status "error" "Invalid choice. Please try again."
                ;;
        esac
        echo
    done
}

# Run main function
main "$@"