package consumer

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"

	"github.com/liquedgit/sentinel-flow/ai-agent-checker/internal/repository"
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

// AgentResult is the expected JSON shape from the agent stdout.
type AgentResult struct {
	Description        string `json:"description"`
	ShortDescription   string `json:"short_description"`
	Impact             string `json:"impact"`
	RecommendationFix  string `json:"recommendation_fix"`
	IsViolation        bool   `json:"is_violation"`
}

// CheckConsumer consumes check requests from Kafka, validates projects, and runs the agent.
type CheckConsumer struct {
	reader   *kafka.Reader
	validate *validator.ProjectValidator
	run      *runner.AgentRunner
	repo     *repository.AICheckerRequestRepository
}

// NewCheckConsumer creates a new CheckConsumer. repo may be nil if DATABASE_URL is not set.
func NewCheckConsumer(reader *kafka.Reader, validate *validator.ProjectValidator, run *runner.AgentRunner, repo *repository.AICheckerRequestRepository) *CheckConsumer {
	return &CheckConsumer{
		reader:   reader,
		validate: validate,
		run:      run,
		repo:     repo,
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

	stdout, err := c.run.Run(params)
	if err != nil {
		if c.repo != nil {
			if uerr := c.repo.UpdateStatus(ctx, req.RequestId, "failed"); uerr != nil {
				slog.Error("update status to failed", "request_id", req.RequestId, "error", uerr)
			}
		}
		return nil // Commit so one failure does not block the queue
	}

	var result AgentResult
	body := trimJSONBlock(stdout)
	if err := json.Unmarshal([]byte(body), &result); err != nil {
		slog.Error("parse agent JSON failed", "request_id", req.RequestId, "error", err, "stdout", stdout)
		if c.repo != nil {
			if uerr := c.repo.UpdateStatus(ctx, req.RequestId, "failed"); uerr != nil {
				slog.Error("update status to failed", "request_id", req.RequestId, "error", uerr)
			}
		}
		return nil
	}

	if c.repo != nil {
		var desc, short, impact, rec *string
		if result.Description != "" {
			desc = &result.Description
		}
		if result.ShortDescription != "" {
			short = &result.ShortDescription
		}
		if result.Impact != "" {
			impact = &result.Impact
		}
		if result.RecommendationFix != "" {
			rec = &result.RecommendationFix
		}
		isViol := &result.IsViolation
		if uerr := c.repo.UpdateResult(ctx, req.RequestId, desc, short, impact, rec, isViol); uerr != nil {
			slog.Error("update result failed", "request_id", req.RequestId, "error", uerr)
			if uerr := c.repo.UpdateStatus(ctx, req.RequestId, "failed"); uerr != nil {
				slog.Error("update status to failed", "request_id", req.RequestId, "error", uerr)
			}
		}
	}
	return nil
}

// trimJSONBlock strips a markdown code fence (```json ... ```) from s for parsing.
func trimJSONBlock(s string) string {
	s = strings.TrimSpace(s)
	const prefix = "```json"
	const prefixAlt = "```"
	if strings.HasPrefix(s, prefix) {
		s = s[len(prefix):]
	} else if strings.HasPrefix(s, prefixAlt) {
		s = s[len(prefixAlt):]
	}
	if idx := strings.Index(s, "```"); idx != -1 {
		s = s[:idx]
	}
	return strings.TrimSpace(s)
}
