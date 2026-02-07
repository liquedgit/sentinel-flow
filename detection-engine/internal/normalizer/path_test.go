package normalizer

import (
	"testing"
)

func TestNormalize(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"empty string", "", ""},
		{"whitespace only", "   ", "/"}, // TrimSpace yields ""; no second empty check, so becomes "/"
		{"whitespace around", "  /users/123  ", "/users/:id"},
		{"no leading slash", "users/123", "/users/:id"},
		{"numeric id", "/users/123", "/users/:id"},
		{"multiple numeric ids", "/api/v1/users/123/orders/456", "/api/v1/users/:id/orders/:id"},
		{"uuid", "/users/550e8400-e29b-41d4-a716-446655440000", "/users/:uuid"},
		{"uuid uppercase", "/users/550E8400-E29B-41D4-A716-446655440000", "/users/:uuid"},
		{"hex id 12 chars", "/docs/507f1f77bcf8", "/docs/:id"},
		{"hex id mongo objectid", "/docs/507f1f77bcf86cd799439011", "/docs/:id"},
		{"literal segments unchanged", "/api/health", "/api/health"},
		{"login path", "/login", "/login"},
		{"single segment", "/api", "/api"},
		{"root path", "/", "/"},
		{"trailing slash", "/users/123/", "/users/:id"},
		{"mixed literal and dynamic", "/api/v1/users/123/profile", "/api/v1/users/:id/profile"},
		{"hex too short", "/docs/abc123", "/docs/abc123"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := Normalize(tt.path)
			if got != tt.expected {
				t.Errorf("Normalize(%q) = %q, want %q", tt.path, got, tt.expected)
			}
		})
	}
}
