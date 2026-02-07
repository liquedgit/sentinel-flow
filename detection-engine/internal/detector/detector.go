package detector

import (
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

// Detector checks if a request should trigger a violation alert.
type Detector struct {
	cache *cache.MappingCache
}

// New creates a new Detector.
func New(c *cache.MappingCache) *Detector {
	return &Detector{cache: c}
}

// ShouldAlert returns true if the request should trigger a violation alert.
// Uses normalized_path for cache lookup.
func (d *Detector) ShouldAlert(log *repository.RequestLog) bool {
	if log.Role == "" {
		return false
	}
	allowed := d.cache.GetAllowedRoles(log.NormalizedPath)
	if len(allowed) == 0 {
		return false // learning mode, no mapping yet
	}
	return !d.cache.IsAllowed(log.NormalizedPath, log.Role)
}

// ExpectedRoles returns the allowed roles for an endpoint (for violation records).
func (d *Detector) ExpectedRoles(endpoint string) []string {
	return d.cache.GetAllowedRoles(endpoint)
}
