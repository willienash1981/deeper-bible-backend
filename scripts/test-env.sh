#!/bin/bash

# Test Environment Management Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_status "Docker is running"
}

# Function to start test environment
start_test_env() {
    print_status "Starting test environment..."
    
    # Stop any existing containers
    docker-compose -f docker-compose.test.yml down --volumes 2>/dev/null || true
    
    # Start services
    docker-compose -f docker-compose.test.yml up -d postgres-test redis-test
    
    # Wait for services to be healthy
    print_status "Waiting for services to be healthy..."
    
    # Wait for PostgreSQL
    timeout=60
    counter=0
    while ! docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test -d deeper_bible_test >/dev/null 2>&1; do
        if [ $counter -ge $timeout ]; then
            print_error "PostgreSQL failed to start within $timeout seconds"
            exit 1
        fi
        sleep 1
        counter=$((counter + 1))
    done
    print_status "PostgreSQL is ready"
    
    # Wait for Redis
    counter=0
    while ! docker-compose -f docker-compose.test.yml exec -T redis-test redis-cli ping >/dev/null 2>&1; do
        if [ $counter -ge $timeout ]; then
            print_error "Redis failed to start within $timeout seconds"
            exit 1
        fi
        sleep 1
        counter=$((counter + 1))
    done
    print_status "Redis is ready"
    
    print_status "Test environment is ready!"
}

# Function to stop test environment
stop_test_env() {
    print_status "Stopping test environment..."
    docker-compose -f docker-compose.test.yml down --volumes
    print_status "Test environment stopped"
}

# Function to reset test environment
reset_test_env() {
    print_status "Resetting test environment..."
    stop_test_env
    
    # Remove volumes
    docker volume rm -f deeper-bible-software_postgres_test_data 2>/dev/null || true
    docker volume rm -f deeper-bible-software_redis_test_data 2>/dev/null || true
    
    start_test_env
    print_status "Test environment reset complete"
}

# Function to run database migrations
run_migrations() {
    print_status "Running database migrations..."
    
    # Check if services are running
    if ! docker-compose -f docker-compose.test.yml ps postgres-test | grep -q "Up"; then
        print_error "PostgreSQL test service is not running. Start the environment first."
        exit 1
    fi
    
    # Run migrations
    docker-compose -f docker-compose.test.yml run --rm migrate-test
    print_status "Database migrations completed"
}

# Function to run tests
run_tests() {
    local test_type="${1:-all}"
    
    print_status "Running $test_type tests..."
    
    case $test_type in
        "unit")
            npm run test:unit
            ;;
        "integration")
            npm run test:integration
            ;;
        "e2e")
            npm run test:e2e
            ;;
        "performance")
            npm run test:performance
            ;;
        "all")
            npm run test:coverage
            ;;
        *)
            print_error "Unknown test type: $test_type"
            print_status "Available types: unit, integration, e2e, performance, all"
            exit 1
            ;;
    esac
}

# Function to show logs
show_logs() {
    local service="${1:-all}"
    
    if [ "$service" = "all" ]; then
        docker-compose -f docker-compose.test.yml logs -f
    else
        docker-compose -f docker-compose.test.yml logs -f "$service"
    fi
}

# Function to show environment status
show_status() {
    print_status "Test Environment Status:"
    docker-compose -f docker-compose.test.yml ps
    
    print_status "\nDatabase Connection Test:"
    if docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test -d deeper_bible_test >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} PostgreSQL is accessible"
    else
        echo -e "${RED}✗${NC} PostgreSQL is not accessible"
    fi
    
    print_status "\nRedis Connection Test:"
    if docker-compose -f docker-compose.test.yml exec -T redis-test redis-cli ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Redis is accessible"
    else
        echo -e "${RED}✗${NC} Redis is not accessible"
    fi
}

# Function to clean up test data
cleanup_test_data() {
    print_status "Cleaning up test data..."
    
    # Clean database
    docker-compose -f docker-compose.test.yml exec -T postgres-test psql -U test -d deeper_bible_test -c "
        TRUNCATE TABLE \"User\", \"Book\", \"Report\", \"SymbolPattern\", \"CrossReference\", \"CacheEntry\" CASCADE;
    " 2>/dev/null || print_warning "Some tables may not exist yet"
    
    # Clear Redis
    docker-compose -f docker-compose.test.yml exec -T redis-test redis-cli FLUSHALL >/dev/null 2>&1
    
    print_status "Test data cleaned"
}

# Main script logic
main() {
    local command="${1:-help}"
    
    case $command in
        "start")
            check_docker
            start_test_env
            ;;
        "stop")
            stop_test_env
            ;;
        "reset")
            check_docker
            reset_test_env
            ;;
        "migrate")
            run_migrations
            ;;
        "test")
            run_tests "${2:-all}"
            ;;
        "logs")
            show_logs "$2"
            ;;
        "status")
            show_status
            ;;
        "clean")
            cleanup_test_data
            ;;
        "help"|*)
            echo "Usage: $0 {start|stop|reset|migrate|test|logs|status|clean|help}"
            echo ""
            echo "Commands:"
            echo "  start     - Start test environment (PostgreSQL + Redis)"
            echo "  stop      - Stop test environment"
            echo "  reset     - Reset test environment (removes all data)"
            echo "  migrate   - Run database migrations"
            echo "  test      - Run tests (unit|integration|e2e|performance|all)"
            echo "  logs      - Show logs (service name optional)"
            echo "  status    - Show environment status"
            echo "  clean     - Clean test data (keep structure)"
            echo "  help      - Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0 start"
            echo "  $0 test unit"
            echo "  $0 logs postgres-test"
            echo "  $0 clean"
            ;;
    esac
}

# Run main function with all arguments
main "$@"