package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	maxShortDescriptionLen = 500
	// maxTextLen caps description and recommendation_fix to avoid UI blowups from extremely long markdown.
	maxTextLen = 30_000
)

// AICheckerRequestRepository updates ai_checker_requests rows.
type AICheckerRequestRepository struct {
	pool *pgxpool.Pool
}

// NewAICheckerRequestRepository creates a new AICheckerRequestRepository.
func NewAICheckerRequestRepository(pool *pgxpool.Pool) *AICheckerRequestRepository {
	return &AICheckerRequestRepository{pool: pool}
}

// UpdateResult sets status to 'complete' and the result fields for the given request ID.
// Nil pointer values are stored as SQL NULL. short_description is truncated to 500 chars;
// description and recommendation_fix are truncated to maxTextLen.
func (r *AICheckerRequestRepository) UpdateResult(ctx context.Context, requestID string, description, shortDescription, impact, recommendationFix *string, isViolation *bool) error {
	short := shortDescription
	if short != nil && len(*short) > maxShortDescriptionLen {
		truncated := (*short)[:maxShortDescriptionLen]
		short = &truncated
	}
	desc := description
	if desc != nil && len(*desc) > maxTextLen {
		truncated := (*desc)[:maxTextLen]
		desc = &truncated
	}
	rec := recommendationFix
	if rec != nil && len(*rec) > maxTextLen {
		truncated := (*rec)[:maxTextLen]
		rec = &truncated
	}
	imp := impact
	if imp != nil && len(*imp) > maxTextLen {
		truncated := (*imp)[:maxTextLen]
		imp = &truncated
	}
	_, err := r.pool.Exec(ctx, `
		UPDATE ai_checker_requests
		SET status = 'complete', description = $1, short_description = $2, impact = $3, recommendation_fix = $4, is_violation = $5
		WHERE id = $6
	`, desc, short, imp, rec, isViolation, requestID)
	return err
}

// UpdateStatus sets only the status for the given request ID (e.g. "failed").
func (r *AICheckerRequestRepository) UpdateStatus(ctx context.Context, requestID string, status string) error {
	_, err := r.pool.Exec(ctx, `UPDATE ai_checker_requests SET status = $1 WHERE id = $2`, status, requestID)
	return err
}
