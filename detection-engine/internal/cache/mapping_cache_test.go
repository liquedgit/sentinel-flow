package cache

import (
	"sort"
	"sync"
	"testing"
)

func slicesEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	ac := make([]string, len(a))
	bc := make([]string, len(b))
	copy(ac, a)
	copy(bc, b)
	sort.Strings(ac)
	sort.Strings(bc)
	for i := range ac {
		if ac[i] != bc[i] {
			return false
		}
	}
	return true
}

func TestMappingCache_Refresh_and_GetAllowedRoles(t *testing.T) {
	c := New()
	mappings := map[string][]string{
		"/users/:id":     {"admin", "user"},
		"/api/health":    {},
		"/admin/settings": {"admin"},
	}
	c.Refresh(mappings)

	roles := c.GetAllowedRoles("/users/:id")
	if !slicesEqual(roles, []string{"admin", "user"}) {
		t.Errorf("GetAllowedRoles(/users/:id) = %v, want [admin user]", roles)
	}

	roles = c.GetAllowedRoles("/admin/settings")
	if !slicesEqual(roles, []string{"admin"}) {
		t.Errorf("GetAllowedRoles(/admin/settings) = %v, want [admin]", roles)
	}
}

func TestMappingCache_GetAllowedRoles_unknown_endpoint(t *testing.T) {
	c := New()
	c.Refresh(map[string][]string{"/users/:id": {"admin"}})

	roles := c.GetAllowedRoles("/unknown/path")
	if roles != nil {
		t.Errorf("GetAllowedRoles(unknown) = %v, want nil", roles)
	}
}

func TestMappingCache_GetAllowedRoles_empty_endpoint(t *testing.T) {
	c := New()
	c.Refresh(map[string][]string{"/api/health": {}})

	roles := c.GetAllowedRoles("/api/health")
	if roles != nil {
		t.Errorf("GetAllowedRoles(empty roles) = %v, want nil", roles)
	}
}

func TestMappingCache_IsAllowed(t *testing.T) {
	c := New()
	c.Refresh(map[string][]string{"/users/:id": {"admin", "user"}})

	if !c.IsAllowed("/users/:id", "admin") {
		t.Error("IsAllowed(admin) = false, want true")
	}
	if !c.IsAllowed("/users/:id", "user") {
		t.Error("IsAllowed(user) = false, want true")
	}
	if c.IsAllowed("/users/:id", "guest") {
		t.Error("IsAllowed(guest) = true, want false")
	}
	if c.IsAllowed("/unknown/path", "admin") {
		t.Error("IsAllowed(unknown endpoint) = true, want false")
	}
}

func TestMappingCache_HasMapping(t *testing.T) {
	c := New()
	c.Refresh(map[string][]string{
		"/users/:id": {"admin"},
		"/api/health": {},
	})

	if !c.HasMapping("/users/:id") {
		t.Error("HasMapping(/users/:id) = false, want true")
	}
	if c.HasMapping("/api/health") {
		t.Error("HasMapping(/api/health with empty roles) = true, want false")
	}
	if c.HasMapping("/unknown") {
		t.Error("HasMapping(/unknown) = true, want false")
	}
}

func TestMappingCache_Refresh_overwrites(t *testing.T) {
	c := New()
	c.Refresh(map[string][]string{"/users/:id": {"admin"}})

	if !c.IsAllowed("/users/:id", "admin") {
		t.Fatal("initial refresh failed")
	}

	c.Refresh(map[string][]string{"/users/:id": {"user", "guest"}})

	if c.IsAllowed("/users/:id", "admin") {
		t.Error("admin should be removed after second Refresh")
	}
	if !c.IsAllowed("/users/:id", "user") {
		t.Error("user should be present after second Refresh")
	}
	if !c.IsAllowed("/users/:id", "guest") {
		t.Error("guest should be present after second Refresh")
	}

	roles := c.GetAllowedRoles("/users/:id")
	if !slicesEqual(roles, []string{"user", "guest"}) {
		t.Errorf("GetAllowedRoles = %v, want [user guest]", roles)
	}
}

func TestMappingCache_concurrent_access(t *testing.T) {
	c := New()
	c.Refresh(map[string][]string{"/users/:id": {"admin", "user"}})

	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				_ = c.GetAllowedRoles("/users/:id")
				_ = c.IsAllowed("/users/:id", "admin")
				_ = c.HasMapping("/users/:id")
			}
		}()
	}
	wg.Wait()
}
