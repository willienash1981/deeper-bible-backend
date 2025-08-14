#!/bin/bash

# Rollback Script for Deeper Bible API
# Handles application rollback in case of deployment failures

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
RENDER_API_KEY=${RENDER_API_KEY:-""}
RENDER_SERVICE_ID=${RENDER_SERVICE_ID:-""}
ENVIRONMENT=${ENVIRONMENT:-"production"}
DOCKER_REGISTRY=${DOCKER_REGISTRY:-"ghcr.io"}
IMAGE_NAME=${IMAGE_NAME:-"deeper-bible/backend"}
ROLLBACK_VERSION=${ROLLBACK_VERSION:-""}

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

# Function to get deployment history from Render
get_deployment_history() {
    print_status "info" "Fetching deployment history from Render..."
    
    if [ -z "$RENDER_API_KEY" ] || [ -z "$RENDER_SERVICE_ID" ]; then
        print_status "error" "RENDER_API_KEY and RENDER_SERVICE_ID required"
        exit 1
    fi
    
    curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys?limit=10" \
        | jq -r '.[] | select(.status == "live") | .commit.id' \
        | head -5
}

# Function to rollback on Render
rollback_render() {
    local commit_sha=$1
    
    print_status "info" "Rolling back to commit: $commit_sha"
    
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"clearCache\": false, \"commitId\": \"$commit_sha\"}" \
        "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys")
    
    deploy_id=$(echo "$response" | jq -r '.id')
    
    if [ "$deploy_id" != "null" ]; then
        print_status "success" "Rollback initiated with deploy ID: $deploy_id"
        monitor_deployment "$deploy_id"
    else
        print_status "error" "Failed to initiate rollback"
        echo "$response"
        exit 1
    fi
}

# Function to monitor deployment
monitor_deployment() {
    local deploy_id=$1
    local max_wait=600 # 10 minutes
    local elapsed=0
    
    print_status "info" "Monitoring rollback deployment..."
    
    while [ $elapsed -lt $max_wait ]; do
        status=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
            "https://api.render.com/v1/services/$RENDER_SERVICE_ID/deploys/$deploy_id" \
            | jq -r '.status')
        
        case $status in
            "live")
                print_status "success" "Rollback completed successfully"
                return 0
                ;;
            "build_failed"|"deploy_failed"|"canceled")
                print_status "error" "Rollback failed with status: $status"
                return 1
                ;;
            *)
                echo -n "."
                sleep 10
                elapsed=$((elapsed + 10))
                ;;
        esac
    done
    
    print_status "error" "Rollback timeout after ${max_wait} seconds"
    return 1
}

# Function to rollback Docker image
rollback_docker() {
    local version=$1
    
    print_status "info" "Rolling back to Docker image version: $version"
    
    # Tag the previous version as latest
    docker pull "$DOCKER_REGISTRY/$IMAGE_NAME:$version"
    docker tag "$DOCKER_REGISTRY/$IMAGE_NAME:$version" "$DOCKER_REGISTRY/$IMAGE_NAME:latest"
    docker push "$DOCKER_REGISTRY/$IMAGE_NAME:latest"
    
    print_status "success" "Docker image rollback completed"
}

# Function to rollback database
rollback_database() {
    local backup_file=$1
    
    print_status "info" "Rolling back database..."
    
    if [ -f "./scripts/deployment/migrate.sh" ]; then
        ./scripts/deployment/migrate.sh rollback "$backup_file"
    else
        print_status "warning" "Database rollback script not found"
    fi
}

# Function to verify rollback
verify_rollback() {
    print_status "info" "Verifying rollback..."
    
    # Run health check
    if [ -f "./scripts/deployment/health-check.sh" ]; then
        if ./scripts/deployment/health-check.sh; then
            print_status "success" "Health check passed after rollback"
        else
            print_status "warning" "Health check failed after rollback"
        fi
    fi
}

# Function to notify team
notify_team() {
    local status=$1
    local message=$2
    
    # Slack notification
    if [ -n "$SLACK_WEBHOOK" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\":warning: Rollback $status: $message\"}" \
            "$SLACK_WEBHOOK"
    fi
    
    # Email notification (if configured)
    if [ -n "$ALERT_EMAIL" ]; then
        echo "$message" | mail -s "Rollback $status - Deeper Bible API" "$ALERT_EMAIL"
    fi
}

# Main function
main() {
    local rollback_type=${1:-"auto"}
    
    echo "================================================"
    echo "Deeper Bible API Rollback Tool"
    echo "Environment: $ENVIRONMENT"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================"
    echo
    
    case $rollback_type in
        auto)
            print_status "info" "Automatic rollback to previous deployment"
            
            # Get last successful deployment
            commits=$(get_deployment_history)
            previous_commit=$(echo "$commits" | sed -n '2p')
            
            if [ -z "$previous_commit" ]; then
                print_status "error" "No previous deployment found"
                exit 1
            fi
            
            rollback_render "$previous_commit"
            verify_rollback
            notify_team "SUCCESS" "Automatic rollback to $previous_commit completed"
            ;;
            
        commit)
            local commit_sha=$2
            if [ -z "$commit_sha" ]; then
                print_status "error" "Commit SHA required"
                echo "Usage: $0 commit <sha>"
                exit 1
            fi
            
            rollback_render "$commit_sha"
            verify_rollback
            notify_team "SUCCESS" "Rollback to commit $commit_sha completed"
            ;;
            
        version)
            local version=$2
            if [ -z "$version" ]; then
                print_status "error" "Version required"
                echo "Usage: $0 version <version>"
                exit 1
            fi
            
            rollback_docker "$version"
            verify_rollback
            notify_team "SUCCESS" "Rollback to version $version completed"
            ;;
            
        database)
            local backup_file=$2
            if [ -z "$backup_file" ]; then
                print_status "error" "Backup file required"
                echo "Usage: $0 database <backup_file>"
                exit 1
            fi
            
            rollback_database "$backup_file"
            notify_team "SUCCESS" "Database rollback completed"
            ;;
            
        full)
            print_status "info" "Full rollback initiated"
            
            # Rollback application
            commits=$(get_deployment_history)
            previous_commit=$(echo "$commits" | sed -n '2p')
            rollback_render "$previous_commit"
            
            # Rollback database if backup exists
            latest_backup=$(ls -t ./database/backups/*.sql 2>/dev/null | head -1)
            if [ -n "$latest_backup" ]; then
                rollback_database "$latest_backup"
            fi
            
            verify_rollback
            notify_team "SUCCESS" "Full rollback completed"
            ;;
            
        *)
            echo "Usage: $0 {auto|commit|version|database|full} [options]"
            echo
            echo "Rollback types:"
            echo "  auto     - Rollback to previous deployment"
            echo "  commit   - Rollback to specific commit"
            echo "  version  - Rollback to specific version"
            echo "  database - Rollback database only"
            echo "  full     - Full application and database rollback"
            exit 1
            ;;
    esac
    
    print_status "success" "Rollback completed successfully"
}

# Run main function
main "$@"