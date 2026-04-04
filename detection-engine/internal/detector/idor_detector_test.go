package detector

import (
	"testing"
	"time"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

func TestIDORDetector_ShouldAlert_NoResourceID(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/api/health", // No resource ID
		NormalizedPath: "/api/health",
		UserID:         "user1",
		Role:           "user",
	}

	if detector.ShouldAlert(log) {
		t.Error("expected no alert when path has no resource ID")
	}
}

func TestIDORDetector_ShouldAlert_NoOwnerMapping(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user2",
		Role:           "user",
	}

	if detector.ShouldAlert(log) {
		t.Error("expected no alert when resource has no mapping")
	}
}

func TestIDORDetector_ShouldAlert_SameUserNoAlert(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	// Set up confirmed owner
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user1", // Same as owner
		Role:           "user",
	}

	if detector.ShouldAlert(log) {
		t.Error("expected no alert when owner accesses their own resource")
	}
}

func TestIDORDetector_ShouldAlert_DifferentUserAlerts(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	// Set up confirmed owner
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user2", // Different from owner
		Role:           "user",
	}

	if !detector.ShouldAlert(log) {
		t.Error("expected alert when different user accesses owned resource")
	}
}

func TestIDORDetector_ShouldAlert_PortalUnconfirmedStillAlerts(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	resourceCache.Refresh([]*repository.UserResourceMapping{
		{
			NormalizedPath: "/account/:id",
			ResourceID:     "123",
			OwnerUserID:    "user1",
			Confirmed:      false,
		},
	})

	log := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user2",
		Role:           "user",
	}

	if !detector.ShouldAlert(log) {
		t.Error("expected alert when mapping exists but portal confirmed is false")
	}
}

func TestIDORDetector_GetOwner(t *testing.T) {
	tests := []struct {
		name           string
		setupCache     func(*cache.ResourceCache)
		expectedOwner  string
	}{
		{
			name: "returns owner when resource exists",
			setupCache: func(rc *cache.ResourceCache) {
				rc.RecordAccess("/account/:id", "123", "owner_user", 1)
			},
			expectedOwner: "owner_user",
		},
		{
			name: "returns empty string when resource doesn't exist",
			setupCache: func(rc *cache.ResourceCache) {
				// Don't add anything
			},
			expectedOwner: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resourceCache := cache.NewResourceCache()
			detector := NewIDORDetector(resourceCache)

			if tt.setupCache != nil {
				tt.setupCache(resourceCache)
			}

			log := &repository.RequestLog{
				Path:           "/account/123",
				NormalizedPath: "/account/:id",
			}

			owner := detector.GetOwner(log)
			if owner != tt.expectedOwner {
				t.Errorf("expected owner=%q, got %q", tt.expectedOwner, owner)
			}
		})
	}
}

func TestIDORDetector_GetResourceID_NumericID(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	log := &repository.RequestLog{
		Path:           "/users/12345",
		NormalizedPath: "/users/:id",
	}

	resourceID := detector.GetResourceID(log)
	if resourceID != "12345" {
		t.Errorf("expected resource_id=12345, got %q", resourceID)
	}
}

func TestIDORDetector_GetResourceID_UUID(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	log := &repository.RequestLog{
		Path:           "/posts/550e8400-e29b-41d4-a716-446655440000",
		NormalizedPath: "/posts/:uuid",
	}

	resourceID := detector.GetResourceID(log)
	if resourceID != "550e8400-e29b-41d4-a716-446655440000" {
		t.Errorf("expected resource_id=550e8400-e29b-41d4-a716-446655440000, got %q", resourceID)
	}
}

func TestIDORDetector_GetResourceID_NoID(t *testing.T) {
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	log := &repository.RequestLog{
		Path:           "/api/health",
		NormalizedPath: "/api/health",
	}

	resourceID := detector.GetResourceID(log)
	if resourceID != "" {
		t.Errorf("expected empty resource_id, got %q", resourceID)
	}
}

func TestIDORDetector_GetResourceID_PathWithID(t *testing.T) {
	tests := []struct {
		name          string
		path          string
		normalizedPath string
		expectedID    string
	}{
		{
			name:          "numeric ID in middle of path",
			path:          "/users/123/profile",
			normalizedPath: "/users/:id/profile",
			expectedID:    "123",
		},
		{
			name:          "numeric ID at end",
			path:          "/account/456",
			normalizedPath: "/account/:id",
			expectedID:    "456",
		},
		{
			name:          "UUID in path",
			path:          "/documents/550e8400-e29b-41d4-a716-446655440000",
			normalizedPath: "/documents/:uuid",
			expectedID:    "550e8400-e29b-41d4-a716-446655440000",
		},
		{
			name:          "no ID in path",
			path:          "/api/health",
			normalizedPath: "/api/health",
			expectedID:    "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resourceCache := cache.NewResourceCache()
			detector := NewIDORDetector(resourceCache)

			log := &repository.RequestLog{
				Path:           tt.path,
				NormalizedPath: tt.normalizedPath,
			}

			resourceID := detector.GetResourceID(log)
			if resourceID != tt.expectedID {
				t.Errorf("expected resource_id=%q, got %q", tt.expectedID, resourceID)
			}
		})
	}
}

func TestIDORDetector_CompleteFlow(t *testing.T) {
	// Test the complete IDOR detection flow
	resourceCache := cache.NewResourceCache()
	detector := NewIDORDetector(resourceCache)

	// Directly set up confirmed owner (more reliable than using ShouldAlert for learning)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)
	resourceCache.RecordAccess("/account/:id", "123", "user1", 1)

	owner, ok := resourceCache.GetOwner("/account/:id", "123")
	if owner != "user1" || !ok {
		t.Fatalf("setup failed: expected owner=user1, got %q ok=%v", owner, ok)
	}
	if !resourceCache.HasConfirmedOwner("/account/:id", "123") {
		t.Fatal("setup failed: expected RecordAccess confirmation")
	}

	// User2 tries to access User1's resource - should be flagged
	violationLog := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user2",
		Role:           "user",
	}

	if !detector.ShouldAlert(violationLog) {
		t.Error("user2 should be flagged for accessing user1's confirmed resource")
	}

	// Verify we can get the owner
	owner = detector.GetOwner(violationLog)
	if owner != "user1" {
		t.Errorf("expected owner=user1, got %q", owner)
	}

	// Verify we can get the resource ID
	resourceID := detector.GetResourceID(violationLog)
	if resourceID != "123" {
		t.Errorf("expected resource_id=123, got %q", resourceID)
	}

	// Verify owner can access their own resource without alert
	ownerLog := &repository.RequestLog{
		Timestamp:      time.Now(),
		Method:         "GET",
		Path:           "/account/123",
		NormalizedPath: "/account/:id",
		UserID:         "user1",
		Role:           "user",
	}

	if detector.ShouldAlert(ownerLog) {
		t.Error("user1 should NOT be flagged for accessing their own resource")
	}
}
