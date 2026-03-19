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

// NormalizeResult contains both normalized path and extracted IDs.
type NormalizeResult struct {
	NormalizedPath string
	ExtractedIDs   map[string]string // placeholder -> value, e.g., ":id" -> "123"
}

// Normalize converts a path like /users/123 or /users/abc-123-def to /users/:id
// for grouping similar endpoints together.
func Normalize(path string) string {
	result := NormalizeWithIDs(path)
	return result.NormalizedPath
}

// NormalizeWithIDs returns normalized path AND extracted ID values.
// This is used for IDOR detection where we need to track specific resource IDs.
func NormalizeWithIDs(path string) NormalizeResult {
	if path == "" {
		return NormalizeResult{NormalizedPath: "", ExtractedIDs: make(map[string]string)}
	}
	path = strings.TrimSpace(path)
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}
	parts := strings.Split(path, "/")
	result := make([]string, 0, len(parts))
	extractedIDs := make(map[string]string)

	for _, p := range parts {
		if p == "" {
			continue
		}
		placeholder, value := normalizeSegmentWithID(p)
		result = append(result, placeholder)
		if value != "" {
			extractedIDs[placeholder] = value
		}
	}
	return NormalizeResult{
		NormalizedPath: "/" + strings.Join(result, "/"),
		ExtractedIDs:   extractedIDs,
	}
}

// normalizeSegment returns :id, :uuid, or the original segment if it doesn't match known patterns.
// Also returns the original value if it matches an ID pattern.
func normalizeSegment(segment string) string {
	placeholder, _ := normalizeSegmentWithID(segment)
	return placeholder
}

// normalizeSegmentWithID returns the placeholder and the original value if it's an ID.
func normalizeSegmentWithID(segment string) (placeholder, value string) {
	if uuidRegex.MatchString(segment) {
		return ":uuid", segment
	}
	if numericRegex.MatchString(segment) {
		return ":id", segment
	}
	if hexRegex.MatchString(segment) && len(segment) >= 12 {
		return ":id", segment
	}
	return segment, ""
}

// GetResourceID extracts the first :id or :uuid value from ExtractedIDs.
// Returns empty string if no ID was found.
func GetResourceID(extractedIDs map[string]string) string {
	if id, ok := extractedIDs[":id"]; ok {
		return id
	}
	if uuid, ok := extractedIDs[":uuid"]; ok {
		return uuid
	}
	return ""
}

// GetResourceIDFromPath extracts the resource ID by comparing original and normalized paths.
// This is a convenience function when you don't have ExtractedIDs available.
func GetResourceIDFromPath(originalPath, normalizedPath string) string {
	result := NormalizeWithIDs(originalPath)
	return GetResourceID(result.ExtractedIDs)
}
