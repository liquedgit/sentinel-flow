package consumer

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/detector"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/normalizer"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
	"github.com/segmentio/kafka-go"
)

// AccessEventMessage represents the Kafka message structure.
type AccessEventMessage struct {
	TraceID     string           `json:"trace_id"`
	Method      string           `json:"method"`
	Path        string           `json:"path"`
	Query       string           `json:"query,omitempty"`
	ClientIP    string           `json:"client_ip"`
	Status      int              `json:"status"`
	AuthPresent bool             `json:"auth_present"`
	UserAttr    *UserAttrMessage `json:"user_attr"`
	Timestamp   string           `json:"timestamp"`
}

// UserAttrMessage represents user attributes in the Kafka message.
type UserAttrMessage struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

// RequestLogInserter inserts request logs.
type RequestLogInserter interface {
	Insert(ctx context.Context, log *repository.RequestLog) (int64, error)
}

// ViolationInserter inserts violations.
type ViolationInserter interface {
	Insert(ctx context.Context, v *repository.Violation) error
}

// RequestConsumer consumes request logs from Kafka, persists them, and runs detection.
type RequestConsumer struct {
	reader         *kafka.Reader
	requestLogRepo RequestLogInserter
	violationRepo  ViolationInserter
	detector       *detector.CompositeDetector
}

// NewRequestConsumer creates a new RequestConsumer.
func NewRequestConsumer(
	reader *kafka.Reader,
	requestLogRepo RequestLogInserter,
	violationRepo ViolationInserter,
	detector *detector.CompositeDetector,
) *RequestConsumer {
	return &RequestConsumer{
		reader:         reader,
		requestLogRepo: requestLogRepo,
		violationRepo:  violationRepo,
		detector:       detector,
	}
}

// Run starts consuming. Blocks until ctx is cancelled.
func (c *RequestConsumer) Run(ctx context.Context) error {
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			msg, err := c.reader.FetchMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return ctx.Err()
				}
				slog.Error("fetch message failed", "error", err)
				continue
			}

			if err := c.processMessage(ctx, msg); err != nil {
				slog.Error("process message failed", "error", err, "offset", msg.Offset)
				// Log and continue per plan; don't commit on error
				continue
			}

			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				slog.Error("commit message failed", "error", err)
			}
		}
	}
}

func (c *RequestConsumer) processMessage(ctx context.Context, msg kafka.Message) error {
	var raw AccessEventMessage
	if err := json.Unmarshal(msg.Value, &raw); err != nil {
		return err
	}

	timestamp, err := time.Parse(time.RFC3339, raw.Timestamp)
	if err != nil {
		timestamp = time.Now()
	}

	// Use enhanced normalizer that extracts resource IDs
	normResult := normalizer.NormalizeWithIDs(raw.Path)

	var userID, role string
	if raw.UserAttr != nil {
		userID = raw.UserAttr.UserID
		role = raw.UserAttr.Role
	}

	// Skip saving request logs when we don't have user_id and role
	if userID == "" && role == "" {
		return nil
	}

	log := &repository.RequestLog{
		Timestamp:      timestamp,
		Method:         raw.Method,
		Path:           raw.Path,
		NormalizedPath: normResult.NormalizedPath,
		UserID:         userID,
		Role:           role,
		ClientIP:       raw.ClientIP,
		Status:         raw.Status,
		TraceID:        raw.TraceID,
	}

	id, err := c.requestLogRepo.Insert(ctx, log)
	if err != nil {
		return err
	}
	log.RequestLogID = id

	// Detect all violations (Vertical IDOR and Horizontal IDOR)
	violations := c.detector.DetectAll(log)
	for _, v := range violations {
		if err := c.violationRepo.Insert(ctx, v.Violation); err != nil {
			slog.Error("insert violation failed", "type", v.ViolationType, "error", err)
		}
	}

	return nil
}
