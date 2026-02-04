package consumer

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/liquedgit/sentinel-flow/detection-engine/internal/scanner"
	"github.com/segmentio/kafka-go"
)

// ScanRequestMessage is the optional schema for scan requests from the portal.
type ScanRequestMessage struct {
	RequestID                 string   `json:"request_id"`
	LearningWindowDays        *int     `json:"learning_window_days,omitempty"`
	ViolationThresholdPercent *float64 `json:"violation_threshold_percent,omitempty"`
	MinimumSampleSize         *int     `json:"minimum_sample_size,omitempty"`
}

// ScanConsumer consumes scan requests from Kafka and runs the scanner (single worker).
type ScanConsumer struct {
	reader  *kafka.Reader
	scanner *scanner.Scanner
	params  scanner.ScanParams
}

// NewScanConsumer creates a new ScanConsumer.
func NewScanConsumer(reader *kafka.Reader, s *scanner.Scanner, params scanner.ScanParams) *ScanConsumer {
	return &ScanConsumer{
		reader:  reader,
		scanner: s,
		params:  params,
	}
}

// Run starts consuming. Blocks until ctx is cancelled. Single worker - processes one scan at a time.
func (c *ScanConsumer) Run(ctx context.Context) error {
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
				slog.Error("scan consumer fetch failed", "error", err)
				continue
			}

			params := c.params
			if len(msg.Value) > 0 {
				var req ScanRequestMessage
				if err := json.Unmarshal(msg.Value, &req); err == nil {
					if req.LearningWindowDays != nil {
						params.LearningWindowDays = *req.LearningWindowDays
					}
					if req.ViolationThresholdPercent != nil {
						params.ViolationThresholdPct = *req.ViolationThresholdPercent
					}
					if req.MinimumSampleSize != nil {
						params.MinimumSampleSize = *req.MinimumSampleSize
					}
				}
			}

			slog.Info("running scan", "params", params)
			if err := c.scanner.Scan(ctx, params); err != nil {
				slog.Error("scan failed", "error", err)
				continue
			}

			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				slog.Error("scan consumer commit failed", "error", err)
			}
		}
	}
}
