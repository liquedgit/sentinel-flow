package detector

import (
	"testing"
	"time"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

func TestCompositeDetector_DetectAll_BothViolations(t *testing.T) {
	// Setup RBAC detector with role mapping
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/account/:id": {"admin"}})
	rbacDetector := New(mappingCache)

	// Setup IDOR detector with confirmed resource owner
	resourceCache := cache.NewResourceCache()
	resourceCache.RecordAccess("/account/:id", "123", "owner_user", 1)
	resourceCache.RecordAccess("/account/:id", "123", "owner_user", 1)
	resourceCache.RecordAccess("/account/:id", "123", "owner_user", 1)
	idorDetector := NewIDORDetector(resourceCache)

	composite := NewCompositeDetector(rbacDetector, idorDetector)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "guest_user", // Not owner, not admin
		Role:           "guest",
		RequestLogID:   42,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 2 {
		t.Fatalf("expected 2 violations (RBAC + IDOR), got %d", len(violations))
	}

	// Check RBAC violation
	rbacFound := false
	idorFound := false
	for _, v := range violations {
		if v.ViolationType == repository.ViolationTypeVerticalIDOR {
			rbacFound = true
			if v.Violation.Role != "guest" {
				t.Errorf("RBAC violation role = %q, want guest", v.Violation.Role)
			}
		}
		if v.ViolationType == repository.ViolationTypeHorizontalIDOR {
			idorFound = true
			if len(v.Violation.ExpectedUsers) != 1 || v.Violation.ExpectedUsers[0] != "owner_user" {
				t.Errorf("IDOR violation expected owner_user, got %v", v.Violation.ExpectedUsers)
			}
			if v.Violation.ResourceID != "123" {
				t.Errorf("IDOR violation resource_id = %q, want 123", v.Violation.ResourceID)
			}
		}
	}

	if !rbacFound {
		t.Error("RBAC violation not found")
	}
	if !idorFound {
		t.Error("IDOR violation not found")
	}
}

func TestCompositeDetector_DetectAll_OnlyRBACViolation(t *testing.T) {
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/admin/settings": {"admin"}})
	rbacDetector := New(mappingCache)

	// No IDOR detector or no confirmed mapping
	composite := NewCompositeDetector(rbacDetector, nil)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/admin/settings",
		NormalizedPath: "/admin/settings",
		UserID:         "user1",
		Role:           "guest",
		RequestLogID:   1,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 1 {
		t.Fatalf("expected 1 violation (RBAC only), got %d", len(violations))
	}

	if violations[0].ViolationType != repository.ViolationTypeVerticalIDOR {
		t.Errorf("expected VerticalIDOR, got %v", violations[0].ViolationType)
	}
}

func TestCompositeDetector_DetectAll_OnlyIDORViolation(t *testing.T) {
	// RBAC allows "user" role
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/account/:id": {"user", "admin"}})
	rbacDetector := New(mappingCache)

	// IDOR detector with confirmed owner
	resourceCache := cache.NewResourceCache()
	resourceCache.RecordAccess("/account/:id", "123", "owner_user", 1)
	resourceCache.RecordAccess("/account/:id", "123", "owner_user", 1)
	resourceCache.RecordAccess("/account/:id", "123", "owner_user", 1)
	idorDetector := NewIDORDetector(resourceCache)

	composite := NewCompositeDetector(rbacDetector, idorDetector)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "other_user", // Not owner
		Role:           "user",        // But allowed role
		RequestLogID:   2,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 1 {
		t.Fatalf("expected 1 violation (IDOR only), got %d", len(violations))
	}

	if violations[0].ViolationType != repository.ViolationTypeHorizontalIDOR {
		t.Errorf("expected HorizontalIDOR, got %v", violations[0].ViolationType)
	}
	if violations[0].Violation.ResourceID != "123" {
		t.Errorf("resource_id = %q, want 123", violations[0].Violation.ResourceID)
	}
}

func TestCompositeDetector_DetectAll_NoViolations(t *testing.T) {
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/account/:id": {"user"}})
	rbacDetector := New(mappingCache)

	resourceCache := cache.NewResourceCache()
	// No confirmed mapping
	idorDetector := NewIDORDetector(resourceCache)

	composite := NewCompositeDetector(rbacDetector, idorDetector)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user1",
		Role:           "user",
		RequestLogID:   3,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 0 {
		t.Fatalf("expected 0 violations, got %d", len(violations))
	}
}

func TestCompositeDetector_DetectAll_NilDetectors(t *testing.T) {
	composite := NewCompositeDetector(nil, nil)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		NormalizedPath: "/test",
		RequestLogID:   4,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 0 {
		t.Fatalf("expected 0 violations with nil detectors, got %d", len(violations))
	}
}

func TestCompositeDetector_HasAnyViolation(t *testing.T) {
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/admin": {"admin"}})
	rbacDetector := New(mappingCache)

	composite := NewCompositeDetector(rbacDetector, nil)

	tests := []struct {
		name       string
		role       string
		path       string
		expectViolation bool
	}{
		{
			name:       "unauthorized role triggers violation",
			role:       "guest",
			path:       "/admin",
			expectViolation: true,
		},
		{
			name:       "authorized role no violation",
			role:       "admin",
			path:       "/admin",
			expectViolation: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			log := &repository.RequestLog{
				Timestamp:      time.Now(),
				NormalizedPath: tt.path,
				Role:           tt.role,
				RequestLogID:   5,
			}

			hasViolation := composite.HasAnyViolation(log)
			if hasViolation != tt.expectViolation {
				t.Errorf("HasAnyViolation() = %v, want %v", hasViolation, tt.expectViolation)
			}
		})
	}
}

func TestCompositeDetector_DetectAll_RequestLogIDPreserved(t *testing.T) {
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/admin": {"admin"}})
	rbacDetector := New(mappingCache)

	composite := NewCompositeDetector(rbacDetector, nil)

	const expectedLogID int64 = 12345

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		NormalizedPath: "/admin",
		Role:           "guest",
		RequestLogID:   expectedLogID,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(violations))
	}

	if violations[0].Violation.RequestLogID != expectedLogID {
		t.Errorf("RequestLogID = %d, want %d", violations[0].Violation.RequestLogID, expectedLogID)
	}
}

func TestCompositeDetector_DetectAll_MultipleResourcesSameUser(t *testing.T) {
	// User1 owns multiple resources
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/account/:id": {"user"}})
	rbacDetector := New(mappingCache)

	resourceCache := cache.NewResourceCache()
	// User1 owns resource 123
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	// User1 owns resource 456
	resourceCache.RecordAccess("/account/:id", "456", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "456", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "456", "user1", 1)

	idorDetector := NewIDORDetector(resourceCache)
	composite := NewCompositeDetector(rbacDetector, idorDetector)

	// User2 tries to access user1's resource
	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/456",
		NormalizedPath: "/account/:id",
		UserID:         "user2",
		Role:           "user",
		RequestLogID:   6,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 1 {
		t.Fatalf("expected 1 violation (IDOR only), got %d", len(violations))
	}

	v := violations[0]
	if v.ViolationType != repository.ViolationTypeHorizontalIDOR {
		t.Errorf("expected HorizontalIDOR, got %v", v.ViolationType)
	}
	if v.Violation.ResourceID != "456" {
		t.Errorf("resource_id = %q, want 456", v.Violation.ResourceID)
	}
}

func TestCompositeDetector_DetectAll_IDORWithSameUser(t *testing.T) {
	mappingCache := cache.New()
	mappingCache.Refresh(map[string][]string{"/account/:id": {"user"}})
	rbacDetector := New(mappingCache)

	resourceCache := cache.NewResourceCache()
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)

	idorDetector := NewIDORDetector(resourceCache)
	composite := NewCompositeDetector(rbacDetector, idorDetector)

	// Owner accesses their own resource - no IDOR violation
	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user1",
		Role:           "user",
		RequestLogID:   7,
	}

	violations := composite.DetectAll(log)

	if len(violations) != 0 {
		t.Fatalf("expected 0 violations when owner accesses own resource, got %d", len(violations))
	}
}
