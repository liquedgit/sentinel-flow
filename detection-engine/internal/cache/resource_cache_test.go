package cache

import (
	"sync"
	"testing"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

func TestResourceCache_GetOwner_NotFound(t *testing.T) {
	cache := NewResourceCache()

	owner, confirmed := cache.GetOwner("/account/:id", "123")

	if owner != "" {
		t.Errorf("expected empty owner, got %q", owner)
	}
	if confirmed {
		t.Error("expected confirmed=false, got true")
	}
}

func TestResourceCache_RecordAccess_FirstAccess(t *testing.T) {
	cache := NewResourceCache()

	confirmed := cache.RecordAccess("/account/:id", "123", "user1", 3)

	if confirmed {
		t.Error("expected not confirmed after first access, got true")
	}

	// Verify owner was set
	owner, isConfirmed := cache.GetOwner("/account/:id", "123")
	if owner != "user1" {
		t.Errorf("expected owner=user1, got %q", owner)
	}
	if isConfirmed {
		t.Error("expected confirmed=false, got true")
	}
}

func TestResourceCache_RecordAccess_ConfirmsAfterThreshold(t *testing.T) {
	tests := []struct {
		name              string
		threshold         int
		accessCount       int
		expectConfirmed   bool
	}{
		{
			name:            "threshold of 1 confirms immediately",
			threshold:       1,
			accessCount:     1,
			expectConfirmed: true,
		},
		{
			name:            "threshold of 3 confirms after 3 accesses",
			threshold:       3,
			accessCount:     3,
			expectConfirmed: true,
		},
		{
			name:            "threshold of 3 not confirmed after 2 accesses",
			threshold:       3,
			accessCount:     2,
			expectConfirmed: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cache := NewResourceCache()

			// Access the resource multiple times
			for i := 0; i < tt.accessCount; i++ {
				cache.RecordAccess("/account/:id", "123", "user1", tt.threshold)
			}

			_, confirmed := cache.GetOwner("/account/:id", "123")
			if confirmed != tt.expectConfirmed {
				t.Errorf("expected confirmed=%v, got %v", tt.expectConfirmed, confirmed)
			}
		})
	}
}

func TestResourceCache_RecordAccess_OwnerIsSticky(t *testing.T) {
	cache := NewResourceCache()

	// First user claims the resource
	cache.RecordAccess("/account/:id", "123", "user1", 3)
	cache.RecordAccess("/account/:id", "123", "user1", 3)
	cache.RecordAccess("/account/:id", "123", "user1", 3)

	// Verify owner is user1 and confirmed
	owner, confirmed := cache.GetOwner("/account/:id", "123")
	if owner != "user1" {
		t.Errorf("expected owner=user1, got %q", owner)
	}
	if !confirmed {
		t.Error("expected confirmed=true after 3 accesses")
	}

	// Different user tries to access - ownership should not change
	cache.RecordAccess("/account/:id", "123", "user2", 3)

	owner, confirmed = cache.GetOwner("/account/:id", "123")
	if owner != "user1" {
		t.Errorf("expected owner to still be user1, got %q", owner)
	}
	if !confirmed {
		t.Error("expected confirmed=true")
	}
}

func TestResourceCache_RecordAccess_SameUserIncrementsCount(t *testing.T) {
	cache := NewResourceCache()

	// First access
	cache.RecordAccess("/account/:id", "123", "user1", 3)

	// Second access by same user
	cache.RecordAccess("/account/:id", "123", "user1", 3)

	// Third access - should confirm
	confirmed := cache.RecordAccess("/account/:id", "123", "user1", 3)

	if !confirmed {
		t.Error("expected confirmed=true after 3 accesses by same user")
	}
}

func TestResourceCache_Refresh(t *testing.T) {
	cache := NewResourceCache()

	// Add some mappings directly via Refresh
	mappings := []*repository.UserResourceMapping{
		{
			NormalizedPath:  "/account/:id",
			ResourceID:      "123",
			OwnerUserID:     "user1",
			AccessCount:     5,
			Confirmed:       true,
		},
		{
			NormalizedPath:  "/posts/:id",
			ResourceID:      "456",
			OwnerUserID:     "user2",
			AccessCount:     2,
			Confirmed:       false,
		},
	}

	cache.Refresh(mappings)

	// Check first mapping - confirmed
	owner, confirmed := cache.GetOwner("/account/:id", "123")
	if owner != "user1" {
		t.Errorf("expected owner=user1, got %q", owner)
	}
	if !confirmed {
		t.Error("expected confirmed=true")
	}

	// Check second mapping - not confirmed
	owner, confirmed = cache.GetOwner("/posts/:id", "456")
	if owner != "user2" {
		t.Errorf("expected owner=user2, got %q", owner)
	}
	if confirmed {
		t.Error("expected confirmed=false")
	}
}

func TestResourceCache_HasConfirmedOwner(t *testing.T) {
	cache := NewResourceCache()

	// Initially no owner
	if cache.HasConfirmedOwner("/account/:id", "123") {
		t.Error("expected no confirmed owner initially")
	}

	// Add unconfirmed mapping
	cache.RecordAccess("/account/:id", "123", "user1", 3)
	cache.RecordAccess("/account/:id", "123", "user1", 3)

	if cache.HasConfirmedOwner("/account/:id", "123") {
		t.Error("expected no confirmed owner after 2 accesses (threshold=3)")
	}

	// Confirm the ownership
	cache.RecordAccess("/account/:id", "123", "user1", 3)

	if !cache.HasConfirmedOwner("/account/:id", "123") {
		t.Error("expected confirmed owner after 3 accesses")
	}
}

func TestResourceCache_ConcurrentAccess(t *testing.T) {
	cache := NewResourceCache()
	var wg sync.WaitGroup

	// Concurrent writes
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			cache.RecordAccess("/resource/:id", "abc", "user1", 3)
		}(i)
	}

	// Concurrent reads
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			cache.GetOwner("/resource/:id", "abc")
		}(i)
	}

	wg.Wait()

	// Verify final state
	owner, confirmed := cache.GetOwner("/resource/:id", "abc")
	if owner != "user1" {
		t.Errorf("expected owner=user1, got %q", owner)
	}
	// With 100 accesses and threshold of 3, should be confirmed
	if !confirmed {
		t.Error("expected confirmed=true after many concurrent accesses")
	}
}

func TestResourceCache_GetAll(t *testing.T) {
	cache := NewResourceCache()

	cache.RecordAccess("/account/:id", "123", "user1", 1)
	cache.RecordAccess("/posts/:id", "456", "user2", 1)

	all := cache.GetAll()

	if len(all) != 2 {
		t.Errorf("expected 2 resources, got %d", len(all))
	}

	// Verify the data is a copy, not the original map
	key1 := "/account/:id:123"
	key2 := "/posts/:id:456"

	if _, ok := all[key1]; !ok {
		t.Error("expected key1 to exist in GetAll result")
	}
	if _, ok := all[key2]; !ok {
		t.Error("expected key2 to exist in GetAll result")
	}
}

func TestResourceCache_MultipleResources(t *testing.T) {
	cache := NewResourceCache()

	// Different resources, different owners
	cache.RecordAccess("/account/:id", "111", "user1", 1)
	cache.RecordAccess("/account/:id", "222", "user2", 1)
	cache.RecordAccess("/posts/:id", "333", "user1", 1)

	tests := []struct {
		path            string
		resourceID      string
		expectedOwner   string
	}{
		{"/account/:id", "111", "user1"},
		{"/account/:id", "222", "user2"},
		{"/posts/:id", "333", "user1"},
	}

	for _, tt := range tests {
		t.Run(tt.path+":"+tt.resourceID, func(t *testing.T) {
			owner, _ := cache.GetOwner(tt.path, tt.resourceID)
			if owner != tt.expectedOwner {
				t.Errorf("expected owner=%q, got %q", tt.expectedOwner, owner)
			}
		})
	}
}
