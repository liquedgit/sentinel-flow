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
	RequestID                  string   `json:"request_id"`
	LearningWindowDays         *int     `json:"learning_window_days,omitempty"`
	ViolationThresholdPercent  *float64 `json:"violation_threshold_percent,omitempty"`
	MinimumSampleSize          *int     `json:"minimum_sample_size,omitempty"`
	ResourceDominancePercent   *float64 `json:"resource_dominance_percent,omitempty"`
	// Deprecated: ignored; use resource_dominance_percent.
	ConfirmationThreshold *int `json:"confirmation_threshold,omitempty"`
}

// ScanConsumer consumes scan requests from Kafka and runs RBAC + IDOR scans (single worker).
type ScanConsumer struct {
	reader      *kafka.Reader
	scanner     *scanner.Scanner
	params      scanner.ScanParams
	idorScanner *scanner.IDORScanner
	idorParams  scanner.IDORScanParams
}

// NewScanConsumer creates a new ScanConsumer.
func NewScanConsumer(
	reader *kafka.Reader,
	rbacScanner *scanner.Scanner,
	rbacParams scanner.ScanParams,
	idorScanner *scanner.IDORScanner,
	idorParams scanner.IDORScanParams,
) *ScanConsumer {
	return &ScanConsumer{
		reader:      reader,
		scanner:     rbacScanner,
		params:      rbacParams,
		idorScanner: idorScanner,
		idorParams:  idorParams,
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

			rbacParams := c.params
			idorParams := c.idorParams
			if len(msg.Value) > 0 {
				var req ScanRequestMessage
				if err := json.Unmarshal(msg.Value, &req); err == nil {
					if req.LearningWindowDays != nil {
						rbacParams.LearningWindowDays = *req.LearningWindowDays
						idorParams.LearningWindowDays = *req.LearningWindowDays
					}
					if req.ViolationThresholdPercent != nil {
						rbacParams.ViolationThresholdPct = *req.ViolationThresholdPercent
					}
					if req.MinimumSampleSize != nil {
						rbacParams.MinimumSampleSize = *req.MinimumSampleSize
						idorParams.MinimumSampleSize = *req.MinimumSampleSize
					}
					if req.ResourceDominancePercent != nil {
						idorParams.ResourceDominancePercent = *req.ResourceDominancePercent
					}
				}
			}

			slog.Info("running rbac scan", "params", rbacParams)
			if err := c.scanner.Scan(ctx, rbacParams); err != nil {
				slog.Error("rbac scan failed", "error", err)
				continue
			}

			slog.Info("running idor scan", "params", idorParams)
			if err := c.idorScanner.Scan(ctx, idorParams); err != nil {
				slog.Error("idor scan failed", "error", err)
				continue
			}

			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				slog.Error("scan consumer commit failed", "error", err)
			}
		}
	}
}
