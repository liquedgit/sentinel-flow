package cache

import (
	"sync"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

// ResourceOwner represents the owner of a resource.
type ResourceOwner struct {
	OwnerUserID string
	Confirmed   bool
	AccessCount int64
}

// ResourceCache is a thread-safe in-memory cache of resource ownership.
// Key: normalized_path + ":" + resource_id -> ResourceOwner
type ResourceCache struct {
	mu    sync.RWMutex
	// resources stores resource ownership by composite key
	resources map[string]ResourceOwner
}

// NewResourceCache creates a new ResourceCache.
func NewResourceCache() *ResourceCache {
	return &ResourceCache{
		resources: make(map[string]ResourceOwner),
	}
}

// GetOwner returns the owner user_id and whether a mapping exists in the cache.
// Operator confirmation (ResourceOwner.Confirmed) is exposed via HasConfirmedOwner.
func (c *ResourceCache) GetOwner(normalizedPath, resourceID string) (string, bool) {
	key := normalizedPath + ":" + resourceID
	c.mu.RLock()
	defer c.mu.RUnlock()
	owner, ok := c.resources[key]
	if !ok {
		return "", false
	}
	return owner.OwnerUserID, true
}

// RecordAccess records that a user accessed a resource.
// Returns true if the ownership is confirmed after this access.
// If a different user accesses the resource, returns the confirmation status
// without updating the owner (ownership is sticky).
func (c *ResourceCache) RecordAccess(normalizedPath, resourceID, userID string, confirmationThreshold int) bool {
	key := normalizedPath + ":" + resourceID
	c.mu.Lock()
	defer c.mu.Unlock()

	existing, ok := c.resources[key]
	if !ok {
		// First access - this user becomes the potential owner
		c.resources[key] = ResourceOwner{
			OwnerUserID: userID,
			Confirmed:   confirmationThreshold <= 1,
			AccessCount: 1,
		}
		return confirmationThreshold <= 1
	}

	// Same user accessing - increment count
	if existing.OwnerUserID == userID {
		existing.AccessCount++
		if existing.AccessCount >= int64(confirmationThreshold) {
			existing.Confirmed = true
		}
		c.resources[key] = existing
		return existing.Confirmed
	}

	// Different user - don't update owner, just return confirmation status
	// This prevents "ownership theft" through repeated cross-user access
	return existing.Confirmed
}

// Refresh replaces the entire cache with the given mappings from the database.
func (c *ResourceCache) Refresh(mappings []*repository.UserResourceMapping) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.resources = make(map[string]ResourceOwner, len(mappings))
	for _, m := range mappings {
		key := m.NormalizedPath + ":" + m.ResourceID
		c.resources[key] = ResourceOwner{
			OwnerUserID: m.OwnerUserID,
			Confirmed:   m.Confirmed,
			AccessCount: m.AccessCount,
		}
	}
}

// HasConfirmedOwner returns true if the resource is marked confirmed (e.g. portal).
func (c *ResourceCache) HasConfirmedOwner(normalizedPath, resourceID string) bool {
	key := normalizedPath + ":" + resourceID
	c.mu.RLock()
	defer c.mu.RUnlock()
	o, ok := c.resources[key]
	return ok && o.Confirmed
}

// GetAll returns all resources in the cache (for debugging/testing).
func (c *ResourceCache) GetAll() map[string]ResourceOwner {
	c.mu.RLock()
	defer c.mu.RUnlock()
	// Return a copy to avoid race conditions
	result := make(map[string]ResourceOwner, len(c.resources))
	for k, v := range c.resources {
		result[k] = v
	}
	return result
}
