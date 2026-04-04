package detector

import (
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

// IDORDetector checks if a request should trigger an IDOR violation alert.
type IDORDetector struct {
	resourceCache *cache.ResourceCache
}

// NewIDORDetector creates a new IDORDetector.
func NewIDORDetector(resourceCache *cache.ResourceCache) *IDORDetector {
	return &IDORDetector{
		resourceCache: resourceCache,
	}
}

// ShouldAlert returns true when a learned resource owner exists and the requester is someone else.
// Operator confirmation (user_resource_mappings.confirmed) does not gate alerting.
func (d *IDORDetector) ShouldAlert(log *repository.RequestLog) bool {
	resourceID := d.getResourceID(log)
	if resourceID == "" {
		return false // No resource ID, skip IDOR check
	}

	owner, ok := d.resourceCache.GetOwner(log.NormalizedPath, resourceID)
	if !ok {
		return false // No ownership mapping for this resource
	}

	return owner != log.UserID
}

// GetOwner returns the owner of the resource for violation reporting.
// Returns empty string if no owner found.
func (d *IDORDetector) GetOwner(log *repository.RequestLog) string {
	resourceID := d.getResourceID(log)
	if resourceID == "" {
		return ""
	}
	owner, _ := d.resourceCache.GetOwner(log.NormalizedPath, resourceID)
	return owner
}

// GetResourceID extracts the resource ID from the request log.
// This is used for violation reporting.
func (d *IDORDetector) GetResourceID(log *repository.RequestLog) string {
	return d.getResourceID(log)
}

// getResourceID extracts the resource ID from the request log.
// It checks if the normalized path contains :id or :uuid and extracts
// the corresponding value from the original path.
func (d *IDORDetector) getResourceID(log *repository.RequestLog) string {
	// This is a simplified version - we should store extracted IDs in RequestLog
	// For now, we'll extract by comparing original and normalized paths
	originalPath := log.Path
	normalizedPath := log.NormalizedPath

	// Quick check: does the normalized path contain :id or :uuid?
	if !containsPlaceholder(normalizedPath) {
		return ""
	}

	// Extract by comparing path segments
	return extractResourceID(originalPath, normalizedPath)
}

// containsPlaceholder checks if the normalized path contains :id or :uuid.
func containsPlaceholder(path string) bool {
	for i := 0; i < len(path); i++ {
		if i > 0 && path[i] == 'i' && path[i-1] == ':' {
			return true
		}
		if i > 0 && path[i] == 'u' && i-1 > 0 && path[i-1] == 'u' && path[i-2] == ':' {
			return true
		}
	}
	return false
}

// extractResourceID extracts the resource ID by comparing original and normalized paths.
func extractResourceID(originalPath, normalizedPath string) string {
	// Split both paths and compare segment by segment
	origParts := splitPath(originalPath)
	normParts := splitPath(normalizedPath)

	if len(origParts) != len(normParts) {
		return ""
	}

	for i := 0; i < len(normParts); i++ {
		if normParts[i] == ":id" || normParts[i] == ":uuid" {
			return origParts[i]
		}
	}

	return ""
}

// splitPath splits a path into segments, excluding empty segments.
func splitPath(path string) []string {
	if path == "" {
		return []string{}
	}

	parts := make([]string, 0)
	start := 0

	for i := 0; i <= len(path); i++ {
		if i == len(path) || path[i] == '/' {
			if start < i {
				parts = append(parts, path[start:i])
			}
			start = i + 1
		}
	}

	return parts
}
