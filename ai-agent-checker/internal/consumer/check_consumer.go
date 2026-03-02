package consumer

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"

	"github.com/liquedgit/sentinel-flow/ai-agent-checker/internal/runner"
	"github.com/liquedgit/sentinel-flow/ai-agent-checker/internal/validator"
	"github.com/segmentio/kafka-go"
)

// CheckRequestMessage is the schema for check requests.
type CheckRequestMessage struct {
	RequestId       string   `json:"request_id"`
	ProjectName     string   `json:"project_name"`
	Method          string   `json:"method"`
	Endpoint        string   `json:"endpoint"`
	ProhibitedRoles []string `json:"prohibited_roles"`
}

// CheckConsumer consumes check requests from Kafka, validates projects, and runs the agent.
type CheckConsumer struct {
	reader   *kafka.Reader
	validate *validator.ProjectValidator
	run      *runner.AgentRunner
}

// NewCheckConsumer creates a new CheckConsumer.
func NewCheckConsumer(reader *kafka.Reader, validate *validator.ProjectValidator, run *runner.AgentRunner) *CheckConsumer {
	return &CheckConsumer{
		reader:   reader,
		validate: validate,
		run:      run,
	}
}

// Run starts consuming. Blocks until ctx is cancelled.
func (c *CheckConsumer) Run(ctx context.Context) error {
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
				slog.Error("check consumer fetch failed", "error", err)
				continue
			}

			if err := c.processMessage(ctx, msg); err != nil {
				slog.Error("process check request failed", "error", err, "offset", msg.Offset)
				continue
			}

			if err := c.reader.CommitMessages(ctx, msg); err != nil {
				slog.Error("check consumer commit failed", "error", err)
			}
		}
	}
}

func (c *CheckConsumer) processMessage(ctx context.Context, msg kafka.Message) error {
	var req CheckRequestMessage
	if err := json.Unmarshal(msg.Value, &req); err != nil {
		return err
	}

	projectPath, err := c.validate.Validate(req.ProjectName)
	if err != nil {
		if errors.Is(err, validator.ErrProjectNotFound) {
			slog.Warn("project not found, skipping", "project_name", req.ProjectName)
			return nil // Commit to avoid reprocessing
		}
		return err
	}

	params := runner.RunParams{
		ProjectPath:     projectPath,
		Method:          req.Method,
		Endpoint:        req.Endpoint,
		ProhibitedRoles: req.ProhibitedRoles,
	}
	if params.ProhibitedRoles == nil {
		params.ProhibitedRoles = []string{}
	}

	return c.run.Run(params)
}
