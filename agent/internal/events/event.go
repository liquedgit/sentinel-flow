package events

import "time"

type RequestEvent struct {
	TraceID     string            `json:"trace_id"`
	Method      string            `json:"method"`
	Path        string            `json:"path"`
	Query       string            `json:"query,omitempty"`
	ClientIP    string            `json:"client_ip"`
	Status      int               `json:"status"`
	AuthPresent bool              `json:"auth_present"`
	User        *UserRequestEvent `json:"user_attr"`
	Timestamp   time.Time         `json:"timestamp"`
}

type UserRequestEvent struct {
	UserId string `json:"user_id"`
	Role   string `json:"role"`
}
