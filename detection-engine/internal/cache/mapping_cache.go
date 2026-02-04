package cache

import (
	"sync"
)

// MappingCache is a thread-safe in-memory cache of endpoint (normalized path) -> allowed roles.
type MappingCache struct {
	mu    sync.RWMutex
	roles map[string]map[string]struct{}
}

// New creates a new MappingCache.
func New() *MappingCache {
	return &MappingCache{
		roles: make(map[string]map[string]struct{}),
	}
}

// GetAllowedRoles returns the allowed roles for the given endpoint (normalized path).
// Returns nil if the endpoint has no mapping (learning mode).
func (c *MappingCache) GetAllowedRoles(endpoint string) []string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	roleSet, ok := c.roles[endpoint]
	if !ok || len(roleSet) == 0 {
		return nil
	}
	roles := make([]string, 0, len(roleSet))
	for r := range roleSet {
		roles = append(roles, r)
	}
	return roles
}

// HasMapping returns true if the endpoint has a learned mapping.
func (c *MappingCache) HasMapping(endpoint string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	roleSet, ok := c.roles[endpoint]
	return ok && len(roleSet) > 0
}

// IsAllowed returns true if the role is allowed for the endpoint.
func (c *MappingCache) IsAllowed(endpoint, role string) bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	roleSet, ok := c.roles[endpoint]
	if !ok {
		return false
	}
	_, allowed := roleSet[role]
	return allowed
}

// Refresh replaces the entire cache with the given mappings.
// mappings: endpoint (normalized path) -> list of allowed roles.
func (c *MappingCache) Refresh(mappings map[string][]string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.roles = make(map[string]map[string]struct{}, len(mappings))
	for endpoint, roles := range mappings {
		roleSet := make(map[string]struct{}, len(roles))
		for _, r := range roles {
			roleSet[r] = struct{}{}
		}
		c.roles[endpoint] = roleSet
	}
}
