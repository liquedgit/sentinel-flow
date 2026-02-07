-- Request logs (high volume, time-partitioned)
CREATE TABLE request_logs (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    normalized_path VARCHAR(500),
    user_id VARCHAR(255),
    role VARCHAR(100),
    client_ip INET,
    status INTEGER,
    trace_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_request_logs_scan ON request_logs (normalized_path, role, timestamp)
    WHERE role IS NOT NULL AND normalized_path IS NOT NULL;

-- Learned endpoint-role mappings (one row per path+role)
CREATE TABLE endpoint_role_mappings (
    id SERIAL PRIMARY KEY,
    normalized_path VARCHAR(500) NOT NULL,
    allowed_role VARCHAR(100) NOT NULL,
    request_count BIGINT DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    auto_generated BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(normalized_path, allowed_role)
);

-- Detected violations
CREATE TABLE violations (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    normalized_path VARCHAR(500) NOT NULL,
    user_id VARCHAR(255),
    role VARCHAR(100),
    expected_roles JSONB,
    status VARCHAR(20) DEFAULT 'new',
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMPTZ,
    request_log_id BIGINT REFERENCES request_logs(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System configuration
CREATE TABLE configurations (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(255)
);

-- Audit log
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    user_id VARCHAR(255),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
