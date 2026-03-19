package repository

import "time"

type ViolationType string

const (
	ViolationTypeVerticalIDOR   ViolationType = "vertical_idor"
	ViolationTypeHorizontalIDOR ViolationType = "horizontal_idor"
)

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
	RequestLogID   int64 // Set after Insert
}

// Violation represents a detected RBAC or IDOR violation.
type Violation struct {
	Timestamp      time.Time
	NormalizedPath string
	UserID         string
	Role           string
	ExpectedRoles  []string // For RBAC violations
	ExpectedUsers  []string // For IDOR violations - owner user IDs
	ResourceID     string   // For IDOR violations - specific resource accessed
	ViolationType  ViolationType
	RequestLogID   int64
}

// UserResourceMapping represents a resource-to-owner mapping for IDOR detection.
type UserResourceMapping struct {
	ID              int64
	NormalizedPath  string
	ResourceID      string
	OwnerUserID     string
	FirstAccessTime time.Time
	LastAccessTime  time.Time
	AccessCount     int64
	Confirmed       bool
}

// EndpointRoleMapping represents a single path+role mapping (one row in endpoint_role_mappings).
type EndpointRoleMapping struct {
	NormalizedPath string
	AllowedRole    string
	RequestCount   int64
	Percentage     float64
	Status         string
}

// EndpointStatsRow is a row from the scan aggregation query.
type EndpointStatsRow struct {
	NormalizedPath string
	Role           string
	RoleCount      int64
	Percentage     float64
	TotalRequests  int64
}
