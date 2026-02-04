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

// RequestLogMessage is the JSON schema from the agent (Kafka).
type RequestLogMessage struct {
	Timestamp      string `json:"timestamp"`
	Method         string `json:"method"`
	Endpoint       string `json:"endpoint"`
	UserID         string `json:"user_id"`
	Role           string `json:"role"`
	SourceIP       string `json:"source_ip"`
	ResponseStatus int    `json:"response_status"`
	TraceID        string `json:"trace_id"`
}

// RequestConsumer consumes request logs from Kafka, persists them, and runs detection.
type RequestConsumer struct {
	reader         *kafka.Reader
	requestLogRepo *repository.RequestLogRepository
	violationRepo  *repository.ViolationRepository
	detector       *detector.Detector
}

// NewRequestConsumer creates a new RequestConsumer.
func NewRequestConsumer(
	reader *kafka.Reader,
	requestLogRepo *repository.RequestLogRepository,
	violationRepo *repository.ViolationRepository,
	detector *detector.Detector,
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
	var raw RequestLogMessage
	if err := json.Unmarshal(msg.Value, &raw); err != nil {
		return err
	}

	timestamp, err := time.Parse(time.RFC3339, raw.Timestamp)
	if err != nil {
		timestamp = time.Now()
	}

	normalizedPath := normalizer.Normalize(raw.Endpoint)

	log := &repository.RequestLog{
		Timestamp:      timestamp,
		Method:         raw.Method,
		Endpoint:       raw.Endpoint,
		NormalizedPath: normalizedPath,
		UserID:         raw.UserID,
		Role:           raw.Role,
		SourceIP:       raw.SourceIP,
		ResponseStatus: raw.ResponseStatus,
		TraceID:        raw.TraceID,
	}

	id, err := c.requestLogRepo.Insert(ctx, log)
	if err != nil {
		return err
	}

	if c.detector.ShouldAlert(log) {
		v := &repository.Violation{
			Timestamp:     log.Timestamp,
			Endpoint:      log.NormalizedPath,
			UserID:        log.UserID,
			Role:          log.Role,
			ExpectedRoles: c.detector.ExpectedRoles(log.NormalizedPath),
			RequestLogID:  id,
		}
		if err := c.violationRepo.Insert(ctx, v); err != nil {
			slog.Error("insert violation failed", "error", err)
		}
	}

	return nil
}
