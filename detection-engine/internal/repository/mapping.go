package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MappingRepository handles persistence of endpoint-role mappings.
type MappingRepository struct {
	pool *pgxpool.Pool
}

// NewMappingRepository creates a new MappingRepository.
func NewMappingRepository(pool *pgxpool.Pool) *MappingRepository {
	return &MappingRepository{pool: pool}
}

// LoadActiveMappings loads all endpoint-role mappings with status = 'active'.
// Aggregates rows from endpoint_role_mappings into map[endpoint][]roles for cache population.
func (r *MappingRepository) LoadActiveMappings(ctx context.Context) (map[string][]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT normalized_path, allowed_role
		FROM endpoint_role_mappings
		WHERE status = 'active'
		ORDER BY normalized_path, allowed_role
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]string)
	for rows.Next() {
		var normalizedPath string
		var allowedRole string
		if err := rows.Scan(&normalizedPath, &allowedRole); err != nil {
			return nil, err
		}
		result[normalizedPath] = append(result[normalizedPath], allowedRole)
	}
	return result, rows.Err()
}

// UpsertMappings upserts multiple endpoint-role mappings in a transaction.
// Only updates rows where auto_generated = TRUE; never overwrites manually added roles.
func (r *MappingRepository) UpsertMappings(ctx context.Context, mappings []*EndpointRoleMapping) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, m := range mappings {
		_, err := tx.Exec(ctx, `
			INSERT INTO endpoint_role_mappings (normalized_path, allowed_role, request_count, percentage, status, auto_generated, updated_at)
			VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
			ON CONFLICT (normalized_path, allowed_role) DO UPDATE SET
				request_count = EXCLUDED.request_count,
				percentage = EXCLUDED.percentage,
				status = EXCLUDED.status,
				auto_generated = TRUE,
				updated_at = NOW()
			WHERE endpoint_role_mappings.auto_generated = TRUE
		`,
			m.NormalizedPath, m.AllowedRole, m.RequestCount, m.Percentage, m.Status,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
