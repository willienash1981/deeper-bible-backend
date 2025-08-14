#!/bin/bash

# Database Migration Script for Deeper Bible API
# Handles database migrations with rollback capability

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

# Configuration
DATABASE_URL=${DATABASE_URL}  # Must be provided via environment variable
MIGRATION_DIR=${MIGRATION_DIR:-"./database/migrations"}
BACKUP_DIR=${BACKUP_DIR:-"./database/backups"}
ENVIRONMENT=${NODE_ENV:-"development"}

# Validate DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_status "error" "DATABASE_URL environment variable is required"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

# Function to create backup
create_backup() {
    local backup_name="migration_backup_$(date +%Y%m%d_%H%M%S).sql"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    print_status "info" "Creating database backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    if pg_dump "$DATABASE_URL" > "$backup_path" 2>/dev/null; then
        print_status "success" "Backup created: $backup_path"
        echo "$backup_path"
    else
        print_status "error" "Failed to create backup"
        exit 1
    fi
}

# Function to restore backup
restore_backup() {
    local backup_path=$1
    
    print_status "info" "Restoring database from backup: $backup_path"
    
    if [ ! -f "$backup_path" ]; then
        print_status "error" "Backup file not found: $backup_path"
        exit 1
    fi
    
    if psql "$DATABASE_URL" < "$backup_path" 2>/dev/null; then
        print_status "success" "Database restored successfully"
    else
        print_status "error" "Failed to restore database"
        exit 1
    fi
}

# Function to run migrations
run_migrations() {
    print_status "info" "Running database migrations..."
    
    # Check if using Prisma
    if [ -f "prisma/schema.prisma" ]; then
        print_status "info" "Detected Prisma, running Prisma migrations..."
        
        if npx prisma migrate deploy; then
            print_status "success" "Prisma migrations completed successfully"
        else
            print_status "error" "Prisma migrations failed"
            return 1
        fi
    # Check if using TypeORM
    elif [ -f "ormconfig.json" ] || [ -f "ormconfig.js" ]; then
        print_status "info" "Detected TypeORM, running TypeORM migrations..."
        
        if npm run typeorm migration:run; then
            print_status "success" "TypeORM migrations completed successfully"
        else
            print_status "error" "TypeORM migrations failed"
            return 1
        fi
    # Check for SQL migration files
    elif [ -d "$MIGRATION_DIR" ]; then
        print_status "info" "Running SQL migration files..."
        
        for migration in "$MIGRATION_DIR"/*.sql; do
            if [ -f "$migration" ]; then
                print_status "info" "Running migration: $(basename "$migration")"
                
                if psql "$DATABASE_URL" < "$migration" 2>/dev/null; then
                    print_status "success" "Migration applied: $(basename "$migration")"
                else
                    print_status "error" "Migration failed: $(basename "$migration")"
                    return 1
                fi
            fi
        done
        
        print_status "success" "All SQL migrations completed"
    else
        print_status "warning" "No migration system detected"
        return 0
    fi
}

# Function to verify migrations
verify_migrations() {
    print_status "info" "Verifying database schema..."
    
    # Simple connectivity check
    if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
        print_status "success" "Database connection verified"
    else
        print_status "error" "Cannot connect to database"
        return 1
    fi
    
    # Check if migrations table exists (Prisma)
    if psql "$DATABASE_URL" -c "SELECT 1 FROM _prisma_migrations LIMIT 1" >/dev/null 2>&1; then
        local pending=$(npx prisma migrate status 2>/dev/null | grep -c "pending" || echo "0")
        if [ "$pending" -eq 0 ]; then
            print_status "success" "No pending Prisma migrations"
        else
            print_status "warning" "$pending pending Prisma migrations found"
        fi
    fi
    
    return 0
}

# Function to generate migration
generate_migration() {
    local migration_name=$1
    
    if [ -z "$migration_name" ]; then
        print_status "error" "Migration name required"
        echo "Usage: $0 generate <migration_name>"
        exit 1
    fi
    
    print_status "info" "Generating migration: $migration_name"
    
    # Check if using Prisma
    if [ -f "prisma/schema.prisma" ]; then
        if npx prisma migrate dev --name "$migration_name" --create-only; then
            print_status "success" "Prisma migration generated: $migration_name"
        else
            print_status "error" "Failed to generate Prisma migration"
            exit 1
        fi
    # Check if using TypeORM
    elif [ -f "ormconfig.json" ] || [ -f "ormconfig.js" ]; then
        if npm run typeorm migration:generate -- -n "$migration_name"; then
            print_status "success" "TypeORM migration generated: $migration_name"
        else
            print_status "error" "Failed to generate TypeORM migration"
            exit 1
        fi
    else
        # Create SQL migration template
        mkdir -p "$MIGRATION_DIR"
        local timestamp=$(date +%Y%m%d%H%M%S)
        local migration_file="$MIGRATION_DIR/${timestamp}_${migration_name}.sql"
        
        cat > "$migration_file" << EOF
-- Migration: $migration_name
-- Created: $(date)
-- Environment: $ENVIRONMENT

BEGIN;

-- Add your migration SQL here

COMMIT;
EOF
        
        print_status "success" "SQL migration template created: $migration_file"
    fi
}

# Main function
main() {
    local command=${1:-"migrate"}
    
    echo "================================================"
    echo "Deeper Bible Database Migration Tool"
    echo "Environment: $ENVIRONMENT"
    echo "Database: $DATABASE_URL"
    echo "Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "================================================"
    echo
    
    case $command in
        migrate|up)
            # Create backup before migration
            backup_path=$(create_backup)
            
            # Run migrations
            if run_migrations; then
                verify_migrations
                print_status "success" "Migration completed successfully"
                exit 0
            else
                print_status "error" "Migration failed, rolling back..."
                restore_backup "$backup_path"
                exit 1
            fi
            ;;
            
        rollback|down)
            local backup_file=$2
            if [ -z "$backup_file" ]; then
                print_status "error" "Backup file required for rollback"
                echo "Usage: $0 rollback <backup_file>"
                exit 1
            fi
            restore_backup "$backup_file"
            ;;
            
        generate|create)
            generate_migration "$2"
            ;;
            
        verify|status)
            verify_migrations
            ;;
            
        backup)
            create_backup
            ;;
            
        *)
            echo "Usage: $0 {migrate|rollback|generate|verify|backup} [options]"
            echo
            echo "Commands:"
            echo "  migrate    - Run pending migrations"
            echo "  rollback   - Restore from backup"
            echo "  generate   - Create new migration"
            echo "  verify     - Check migration status"
            echo "  backup     - Create database backup"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"