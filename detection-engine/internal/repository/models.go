package repository

import "time"

// RequestLog represents a single request event from Kafka.
type RequestLog struct {
	Timestamp      time.Time
	Method         string
	Endpoint       string
	NormalizedPath string
	UserID         string
	Role           string
	SourceIP       string
	ResponseStatus int
	TraceID        string
}

// Violation represents a detected RBAC violation.
type Violation struct {
	Timestamp     time.Time
	Endpoint      string
	UserID        string
	Role          string
	ExpectedRoles []string
	RequestLogID  int64
}

// EndpointMapping represents a learned endpoint-to-roles mapping.
type EndpointMapping struct {
	Endpoint       string
	AllowedRoles   []string
	TotalRequests  int64
	LearningStatus string
}

// EndpointStatsRow is a row from the scan aggregation query.
type EndpointStatsRow struct {
	Endpoint      string
	Role          string
	RoleCount     int64
	Percentage    float64
	TotalRequests int64
}
