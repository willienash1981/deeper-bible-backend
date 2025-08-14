-- Database Security Initialization Script
-- This script runs during PostgreSQL container startup

-- Enable security extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create audit log table for security events
CREATE TABLE IF NOT EXISTS security_audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    event_type VARCHAR(50) NOT NULL,
    user_id TEXT,
    ip_address INET,
    user_agent TEXT,
    table_name VARCHAR(50),
    operation VARCHAR(20),
    success BOOLEAN NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient audit log querying
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp 
ON security_audit_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_event_type 
ON security_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_security_audit_user_id 
ON security_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_security_audit_ip 
ON security_audit_log(ip_address);

-- Create security roles
DO $$
BEGIN
    -- Read-only role for analytics and reporting
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_read_only') THEN
        CREATE ROLE app_read_only;
    END IF;
    
    -- Read-write role for application operations
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_read_write') THEN
        CREATE ROLE app_read_write;
    END IF;
    
    -- Admin role for maintenance operations
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_admin') THEN
        CREATE ROLE app_admin;
    END IF;
END
$$;

-- Grant basic permissions to roles
GRANT CONNECT ON DATABASE deeper_bible TO app_read_only;
GRANT USAGE ON SCHEMA public TO app_read_only;

GRANT CONNECT ON DATABASE deeper_bible TO app_read_write;
GRANT USAGE ON SCHEMA public TO app_read_write;

GRANT CONNECT ON DATABASE deeper_bible TO app_admin;
GRANT USAGE ON SCHEMA public TO app_admin;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_event_type VARCHAR(50),
    p_user_id TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_table_name VARCHAR(50) DEFAULT NULL,
    p_operation VARCHAR(20) DEFAULT NULL,
    p_success BOOLEAN DEFAULT TRUE,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (
        event_type, user_id, ip_address, user_agent,
        table_name, operation, success, details
    ) VALUES (
        p_event_type, p_user_id, p_ip_address, p_user_agent,
        p_table_name, p_operation, p_success, p_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check connection limits
CREATE OR REPLACE FUNCTION check_connection_limit() RETURNS TRIGGER AS $$
DECLARE
    current_connections INTEGER;
    max_allowed INTEGER := 50;
BEGIN
    SELECT COUNT(*) INTO current_connections
    FROM pg_stat_activity
    WHERE datname = current_database()
      AND state = 'active';
    
    IF current_connections > max_allowed THEN
        PERFORM log_security_event(
            'connection_limit_exceeded',
            NULL,
            inet_client_addr(),
            NULL,
            NULL,
            NULL,
            FALSE,
            json_build_object('current_connections', current_connections, 'max_allowed', max_allowed)::jsonb
        );
        
        RAISE EXCEPTION 'Connection limit exceeded: % active connections (max: %)', 
            current_connections, max_allowed;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Security settings for PostgreSQL
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_statement = 'mod'; -- Log all modifications
ALTER SYSTEM SET log_duration = on;
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries (>1s)

-- Reload configuration
SELECT pg_reload_conf();

-- Create function to rotate audit logs
CREATE OR REPLACE FUNCTION rotate_audit_logs(days_to_keep INTEGER DEFAULT 90) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM security_audit_log 
    WHERE timestamp < (NOW() - (days_to_keep || ' days')::INTERVAL);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    PERFORM log_security_event(
        'audit_log_rotation',
        NULL,
        NULL,
        NULL,
        'security_audit_log',
        'DELETE',
        TRUE,
        json_build_object('deleted_records', deleted_count, 'days_kept', days_to_keep)::jsonb
    );
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create scheduled job for log rotation (requires pg_cron extension in production)
-- This would typically be set up in production with pg_cron or external cron job

-- Log successful initialization
SELECT log_security_event(
    'database_security_initialized',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    TRUE,
    json_build_object('timestamp', NOW(), 'version', '1.0')::jsonb
);

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Database security initialization completed successfully';
    RAISE NOTICE 'Security audit logging enabled';
    RAISE NOTICE 'Connection monitoring configured';
    RAISE NOTICE 'Security roles created: app_read_only, app_read_write, app_admin';
END
$$;