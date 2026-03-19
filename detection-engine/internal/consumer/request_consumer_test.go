package consumer

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/detector"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
	"github.com/segmentio/kafka-go"
)

// newCompositeDetector creates a CompositeDetector with only RBAC detection for testing.
func newCompositeDetector(mappingCache *cache.MappingCache) *detector.CompositeDetector {
	rbacDetector := detector.New(mappingCache)
	return detector.NewCompositeDetector(rbacDetector, nil)
}

type mockRequestLogInserter struct {
	inserts []*repository.RequestLog
	nextID  int64
	err     error
}

func (m *mockRequestLogInserter) Insert(ctx context.Context, log *repository.RequestLog) (int64, error) {
	if m.err != nil {
		return 0, m.err
	}
	m.inserts = append(m.inserts, log)
	m.nextID++
	return m.nextID, nil
}

type mockViolationInserter struct {
	inserts []*repository.Violation
	err     error
}

func (m *mockViolationInserter) Insert(ctx context.Context, v *repository.Violation) error {
	if m.err != nil {
		return m.err
	}
	m.inserts = append(m.inserts, v)
	return nil
}

func mustMarshal(v interface{}) []byte {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return b
}

func TestRequestConsumer_processMessage_valid_event_inserts_log(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin"}})
	det := newCompositeDetector(c)

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)

	event := AccessEventMessage{
		TraceID:   "trace-1",
		Method:    "GET",
		Path:      "/users/123",
		ClientIP:  "192.168.1.1",
		Status:    200,
		Timestamp: time.Now().Format(time.RFC3339),
		UserAttr:  &UserAttrMessage{UserID: "u1", Role: "admin"},
	}
	msg := kafka.Message{Value: mustMarshal(event)}

	err := consumer.processMessage(ctx, msg)
	if err != nil {
		t.Fatalf("processMessage: %v", err)
	}

	if len(logRepo.inserts) != 1 {
		t.Fatalf("expected 1 insert, got %d", len(logRepo.inserts))
	}
	log := logRepo.inserts[0]
	if log.NormalizedPath != "/users/:id" {
		t.Errorf("NormalizedPath = %q, want /users/:id", log.NormalizedPath)
	}
	if log.Role != "admin" {
		t.Errorf("Role = %q, want admin", log.Role)
	}
	if log.Path != "/users/123" {
		t.Errorf("Path = %q, want /users/123", log.Path)
	}
}

func TestRequestConsumer_processMessage_allowed_role_no_violation(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin", "user"}})
	det := newCompositeDetector(c)

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)

	event := AccessEventMessage{
		Path:      "/users/456",
		Timestamp: time.Now().Format(time.RFC3339),
		UserAttr:  &UserAttrMessage{Role: "user"},
	}
	msg := kafka.Message{Value: mustMarshal(event)}

	err := consumer.processMessage(ctx, msg)
	if err != nil {
		t.Fatalf("processMessage: %v", err)
	}

	if len(violRepo.inserts) != 0 {
		t.Errorf("expected 0 violations (allowed role), got %d", len(violRepo.inserts))
	}
}

func TestRequestConsumer_processMessage_disallowed_role_creates_violation(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	c := cache.New()
	c.Refresh(map[string][]string{"/users/:id": {"admin"}})
	det := newCompositeDetector(c)

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)

	event := AccessEventMessage{
		Path:      "/users/789",
		Timestamp: time.Now().Format(time.RFC3339),
		UserAttr:  &UserAttrMessage{UserID: "u2", Role: "guest"},
	}
	msg := kafka.Message{Value: mustMarshal(event)}

	err := consumer.processMessage(ctx, msg)
	if err != nil {
		t.Fatalf("processMessage: %v", err)
	}

	if len(violRepo.inserts) != 1 {
		t.Fatalf("expected 1 violation, got %d", len(violRepo.inserts))
	}
	v := violRepo.inserts[0]
	if v.Role != "guest" {
		t.Errorf("Violation Role = %q, want guest", v.Role)
	}
	if v.NormalizedPath != "/users/:id" {
		t.Errorf("Violation NormalizedPath = %q, want /users/:id", v.NormalizedPath)
	}
	if v.RequestLogID != 1 {
		t.Errorf("RequestLogID = %d, want 1", v.RequestLogID)
	}
}

func TestRequestConsumer_processMessage_invalid_json_returns_error(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	det := newCompositeDetector(cache.New())

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)
	msg := kafka.Message{Value: []byte("not json")}

	err := consumer.processMessage(ctx, msg)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
	if len(logRepo.inserts) != 0 {
		t.Errorf("expected 0 inserts on error, got %d", len(logRepo.inserts))
	}
}

func TestRequestConsumer_processMessage_invalid_timestamp_uses_now(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	det := newCompositeDetector(cache.New())

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)

	event := AccessEventMessage{
		Path:      "/api/health",
		Timestamp: "invalid",
		UserAttr:  &UserAttrMessage{UserID: "u1", Role: "user"},
	}
	msg := kafka.Message{Value: mustMarshal(event)}

	err := consumer.processMessage(ctx, msg)
	if err != nil {
		t.Fatalf("processMessage: %v", err)
	}

	if len(logRepo.inserts) != 1 {
		t.Fatalf("expected 1 insert, got %d", len(logRepo.inserts))
	}
	// Timestamp should be roughly "now" (within last second)
	diff := time.Since(logRepo.inserts[0].Timestamp)
	if diff < 0 || diff > 2*time.Second {
		t.Errorf("Timestamp fallback unexpected: diff=%v", diff)
	}
}

func TestRequestConsumer_processMessage_empty_user_attr_skips_save(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	c := cache.New()
	c.Refresh(map[string][]string{"/api/health": {"admin"}})
	det := newCompositeDetector(c)

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)

	event := AccessEventMessage{
		Path:      "/api/health",
		Timestamp: time.Now().Format(time.RFC3339),
		UserAttr:  nil,
	}
	msg := kafka.Message{Value: mustMarshal(event)}

	err := consumer.processMessage(ctx, msg)
	if err != nil {
		t.Fatalf("processMessage: %v", err)
	}

	if len(logRepo.inserts) != 0 {
		t.Errorf("expected 0 inserts when user_id and role are empty, got %d", len(logRepo.inserts))
	}
	if len(violRepo.inserts) != 0 {
		t.Errorf("expected 0 violations, got %d", len(violRepo.inserts))
	}
}

func TestRequestConsumer_processMessage_user_attr_with_empty_strings_skips_save(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	det := newCompositeDetector(cache.New())

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)

	event := AccessEventMessage{
		Path:      "/api/health",
		Timestamp: time.Now().Format(time.RFC3339),
		UserAttr:  &UserAttrMessage{UserID: "", Role: ""},
	}
	msg := kafka.Message{Value: mustMarshal(event)}

	err := consumer.processMessage(ctx, msg)
	if err != nil {
		t.Fatalf("processMessage: %v", err)
	}

	if len(logRepo.inserts) != 0 {
		t.Errorf("expected 0 inserts when user_id and role are empty strings, got %d", len(logRepo.inserts))
	}
}

func TestRequestConsumer_processMessage_path_normalization(t *testing.T) {
	ctx := context.Background()
	logRepo := &mockRequestLogInserter{}
	violRepo := &mockViolationInserter{}
	det := newCompositeDetector(cache.New())

	consumer := NewRequestConsumer(nil, logRepo, violRepo, det)

	event := AccessEventMessage{
		Path:      "/users/550e8400-e29b-41d4-a716-446655440000",
		Timestamp: time.Now().Format(time.RFC3339),
		UserAttr:  &UserAttrMessage{UserID: "u1", Role: "user"},
	}
	msg := kafka.Message{Value: mustMarshal(event)}

	err := consumer.processMessage(ctx, msg)
	if err != nil {
		t.Fatalf("processMessage: %v", err)
	}

	if len(logRepo.inserts) != 1 {
		t.Fatalf("expected 1 insert, got %d", len(logRepo.inserts))
	}
	if logRepo.inserts[0].NormalizedPath != "/users/:uuid" {
		t.Errorf("NormalizedPath = %q, want /users/:uuid", logRepo.inserts[0].NormalizedPath)
	}
}
