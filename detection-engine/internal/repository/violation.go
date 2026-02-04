package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ViolationRepository handles persistence of violations.
type ViolationRepository struct {
	pool *pgxpool.Pool
}

// NewViolationRepository creates a new ViolationRepository.
func NewViolationRepository(pool *pgxpool.Pool) *ViolationRepository {
	return &ViolationRepository{pool: pool}
}

// Insert inserts a violation record.
func (r *ViolationRepository) Insert(ctx context.Context, v *Violation) error {
	expectedRolesJSON, _ := json.Marshal(v.ExpectedRoles)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO violations (timestamp, endpoint, user_id, role, expected_roles, request_log_id)
		VALUES ($1, $2, $3, $4, $5, $6)
	`,
		v.Timestamp, v.Endpoint, v.UserID, v.Role, expectedRolesJSON, v.RequestLogID,
	)
	return err
}
