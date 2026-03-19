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
	expectedUsersJSON, _ := json.Marshal(v.ExpectedUsers)

	// Set default violation type if not specified
	violationType := v.ViolationType
	if violationType == "" {
		violationType = ViolationTypeVerticalIDOR
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO violations (timestamp, normalized_path, user_id, role, expected_roles,
		                        expected_users, resource_id, violation_type, request_log_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`,
		v.Timestamp, v.NormalizedPath, v.UserID, v.Role,
		expectedRolesJSON, expectedUsersJSON, v.ResourceID, violationType, v.RequestLogID,
	)
	return err
}
