package normalizer

import (
	"regexp"
	"strings"
)

var (
	// UUID v4 pattern: 8-4-4-4-12 hex digits
	uuidRegex = regexp.MustCompile(`(?i)^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`)
	// Numeric ID pattern: one or more digits
	numericRegex = regexp.MustCompile(`^\d+$`)
	// Hex string (e.g., MongoDB ObjectId, short hashes)
	hexRegex = regexp.MustCompile(`(?i)^[0-9a-f]{12,32}$`)
)

// Normalize converts a path like /users/123 or /users/abc-123-def to /users/:id
// for grouping similar endpoints together.
func Normalize(path string) string {
	if path == "" {
		return ""
	}
	path = strings.TrimSpace(path)
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	parts := strings.Split(path, "/")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		if p == "" {
			continue
		}
		placeholder := normalizeSegment(p)
		result = append(result, placeholder)
	}
	return "/" + strings.Join(result, "/")
}

// normalizeSegment returns :id, :uuid, or the original segment if it doesn't match known patterns.
func normalizeSegment(segment string) string {
	if uuidRegex.MatchString(segment) {
		return ":uuid"
	}
	if numericRegex.MatchString(segment) {
		return ":id"
	}
	if hexRegex.MatchString(segment) && len(segment) >= 12 {
		return ":id"
	}
	return segment
}
