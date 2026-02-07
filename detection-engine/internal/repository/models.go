package repository

import "time"

// RequestLog represents a single request event from Kafka
type RequestLog struct {
	Timestamp      time.Time
	Method         string
	Path           string
	NormalizedPath string
	UserID         string
	Role           string
	ClientIP       string
	Status         int
	TraceID        string
}

// Violation represents a detected RBAC violation.
type Violation struct {
	Timestamp      time.Time
	NormalizedPath string
	UserID         string
	Role           string
	ExpectedRoles  []string
	RequestLogID   int64
}

// EndpointRoleMapping represents a single path+role mapping (one row in endpoint_role_mappings).
type EndpointRoleMapping struct {
	NormalizedPath string
	AllowedRole    string
	RequestCount   int64
	Percentage     float64
	Status string
}

// EndpointStatsRow is a row from the scan aggregation query.
type EndpointStatsRow struct {
	NormalizedPath string
	Role           string
	RoleCount      int64
	Percentage     float64
	TotalRequests  int64
}
