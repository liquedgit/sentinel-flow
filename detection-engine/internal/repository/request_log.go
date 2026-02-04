package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RequestLogRepository handles persistence of request logs.
type RequestLogRepository struct {
	pool *pgxpool.Pool
}

// NewRequestLogRepository creates a new RequestLogRepository.
func NewRequestLogRepository(pool *pgxpool.Pool) *RequestLogRepository {
	return &RequestLogRepository{pool: pool}
}

// Insert inserts a request log and returns the generated ID.
func (r *RequestLogRepository) Insert(ctx context.Context, log *RequestLog) (int64, error) {
	var id int64
	err := r.pool.QueryRow(ctx, `
		INSERT INTO request_logs (timestamp, method, endpoint, normalized_path, user_id, role, source_ip, response_status, trace_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`,
		log.Timestamp, log.Method, log.Endpoint, nullIfEmpty(log.NormalizedPath), log.UserID, log.Role,
		nullIfEmpty(log.SourceIP), log.ResponseStatus, log.TraceID,
	).Scan(&id)
	return id, err
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
