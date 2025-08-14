#!/bin/bash

# Health Check Script for Deeper Bible API
# This script performs comprehensive health checks on the application

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL=${API_URL:-"http://localhost:3000"}
TIMEOUT=${TIMEOUT:-5}
MAX_RETRIES=${MAX_RETRIES:-3}
RETRY_DELAY=${RETRY_DELAY:-2}

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    
    case $status in
        "success")
            echo -e "${GREEN}✓${NC} $message"
            ;;
        "error")
            echo -e "${RED}✗${NC} $message"
            ;;
        "warning")
            echo -e "${YELLOW}⚠${NC} $message"
            ;;
        *)
            echo "$message"
            ;;
    esac
}

# Function to check endpoint
check_endpoint() {
    local endpoint=$1
    local expected_status=${2:-200}
    local retries=0
    
    while [ $retries -lt $MAX_RETRIES ]; do
        response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout $TIMEOUT "$API_URL$endpoint" || echo "000")
        
        if [ "$response" = "$expected_status" ]; then
            print_status "success" "$endpoint (HTTP $response)"
            return 0
        fi
        
        retries=$((retries + 1))
        if [ $retries -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done
    
    print_status "error" "$endpoint (HTTP $response, expected $expected_status)"
    return 1
}

# Function to check database connectivity
check_database() {
    local db_check=$(curl -s "$API_URL/health/db" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$db_check" = "healthy" ]; then
        print_status "success" "Database connection"
        return 0
    else
        print_status "error" "Database connection ($db_check)"
        return 1
    fi
}

# Function to check Redis connectivity
check_redis() {
    local redis_check=$(curl -s "$API_URL/health/redis" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$redis_check" = "healthy" ]; then
        print_status "success" "Redis connection"
        return 0
    else
        print_status "error" "Redis connection ($redis_check)"
        return 1
    fi
}

# Function to check response time
check_response_time() {
    local endpoint=$1
    local max_time=${2:-2000} # milliseconds
    
    response_time=$(curl -s -o /dev/null -w "%{time_total}" "$API_URL$endpoint")
    response_time_ms=$(echo "$response_time * 1000" | bc | cut -d'.' -f1)
    
    if [ "$response_time_ms" -lt "$max_time" ]; then
        print_status "success" "$endpoint response time (${response_time_ms}ms)"
        return 0
    else
        print_status "warning" "$endpoint response time (${response_time_ms}ms, threshold ${max_time}ms)"
        return 1
    fi
}

# Main health check execution
main() {
    echo "================================================"
    echo "Deeper Bible API Health Check"
    echo "Target: $API_URL"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================"
    echo
    
    local total_checks=0
    local failed_checks=0
    
    # Basic connectivity checks
    echo "Basic Health Checks:"
    check_endpoint "/health" 200 || ((failed_checks++))
    ((total_checks++))
    
    check_endpoint "/api/v1/status" 200 || ((failed_checks++))
    ((total_checks++))
    
    echo
    echo "Service Dependencies:"
    check_database || ((failed_checks++))
    ((total_checks++))
    
    check_redis || ((failed_checks++))
    ((total_checks++))
    
    echo
    echo "API Endpoints:"
    check_endpoint "/api/v1/auth/status" 200 || ((failed_checks++))
    ((total_checks++))
    
    check_endpoint "/api/v1/bible/books" 200 || ((failed_checks++))
    ((total_checks++))
    
    echo
    echo "Performance Checks:"
    check_response_time "/health" 500 || ((failed_checks++))
    ((total_checks++))
    
    check_response_time "/api/v1/status" 1000 || ((failed_checks++))
    ((total_checks++))
    
    echo
    echo "================================================"
    echo "Health Check Summary"
    echo "================================================"
    
    local passed_checks=$((total_checks - failed_checks))
    local success_rate=$((passed_checks * 100 / total_checks))
    
    echo "Total Checks: $total_checks"
    echo "Passed: $passed_checks"
    echo "Failed: $failed_checks"
    echo "Success Rate: ${success_rate}%"
    
    if [ $failed_checks -eq 0 ]; then
        print_status "success" "All health checks passed!"
        exit 0
    elif [ $success_rate -ge 75 ]; then
        print_status "warning" "Some health checks failed, but service is operational"
        exit 1
    else
        print_status "error" "Critical health check failures detected"
        exit 2
    fi
}

# Run main function
main "$@"