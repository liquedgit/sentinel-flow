package detector

import (
	"sort"
	"testing"
	"time"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

func makeLog(normalizedPath, role string) *repository.RequestLog {
	return &repository.RequestLog{
		Timestamp:      time.Now(),
		NormalizedPath: normalizedPath,
		Role:           role,
	}
}

func TestDetector_ShouldAlert_empty_role(t *testing.T) {
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin"}})
	det := New(c)

	log := makeLog("/users/:id", "")
	if det.ShouldAlert(log) {
		t.Error("ShouldAlert(empty role) = true, want false")
	}
}

func TestDetector_ShouldAlert_learning_mode(t *testing.T) {
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin"}})
	det := New(c)

	log := makeLog("/unknown/path", "admin")
	if det.ShouldAlert(log) {
		t.Error("ShouldAlert(no mapping for path) = true, want false")
	}
}

func TestDetector_ShouldAlert_allowed_role(t *testing.T) {
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin", "user"}})
	det := New(c)

	log := makeLog("/users/:id", "admin")
	if det.ShouldAlert(log) {
		t.Error("ShouldAlert(allowed role) = true, want false")
	}

	log = makeLog("/users/:id", "user")
	if det.ShouldAlert(log) {
		t.Error("ShouldAlert(allowed role) = true, want false")
	}
}

func TestDetector_ShouldAlert_disallowed_role(t *testing.T) {
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin", "user"}})
	det := New(c)

	log := makeLog("/users/:id", "guest")
	if !det.ShouldAlert(log) {
		t.Error("ShouldAlert(disallowed role) = false, want true")
	}
}

func TestDetector_ExpectedRoles(t *testing.T) {
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin", "user"}})
	det := New(c)

	roles := det.ExpectedRoles("/users/:id")
	if len(roles) != 2 {
		t.Errorf("ExpectedRoles len = %d, want 2", len(roles))
	}
	sort.Strings(roles)
	if roles[0] != "admin" || roles[1] != "user" {
		t.Errorf("ExpectedRoles = %v, want [admin user]", roles)
	}

	roles = det.ExpectedRoles("/unknown")
	if roles != nil {
		t.Errorf("ExpectedRoles(unknown) = %v, want nil", roles)
	}
}
