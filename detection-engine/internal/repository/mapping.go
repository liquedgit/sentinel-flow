package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
)

// MappingRepository handles persistence of endpoint mappings.
type MappingRepository struct {
	pool *pgxpool.Pool
}

// NewMappingRepository creates a new MappingRepository.
func NewMappingRepository(pool *pgxpool.Pool) *MappingRepository {
	return &MappingRepository{pool: pool}
}

// LoadActiveMappings loads all endpoint mappings with learning_status = 'active'.
// Returns map[endpoint][]allowed_roles for cache population.
func (r *MappingRepository) LoadActiveMappings(ctx context.Context) (map[string][]string, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT normalized_path, allowed_roles
		FROM endpoint_mappings
		WHERE learning_status = 'active'
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]string)
	for rows.Next() {
		var normalizedPath string
		var rolesJSON []byte
		if err := rows.Scan(&normalizedPath, &rolesJSON); err != nil {
			return nil, err
		}
		var roles []string
		if err := json.Unmarshal(rolesJSON, &roles); err != nil {
			return nil, err
		}
		result[normalizedPath] = roles
	}
	return result, rows.Err()
}

// UpsertMapping upserts an endpoint mapping.
func (r *MappingRepository) UpsertMapping(ctx context.Context, m *EndpointMapping) error {
	rolesJSON, _ := json.Marshal(m.AllowedRoles)
	_, err := r.pool.Exec(ctx, `
		INSERT INTO endpoint_mappings (normalized_path, allowed_roles, total_requests, learning_status, auto_generated, updated_at)
		VALUES ($1, $2, $3, $4, TRUE, NOW())
		ON CONFLICT (normalized_path) DO UPDATE SET
			allowed_roles = EXCLUDED.allowed_roles,
			total_requests = EXCLUDED.total_requests,
			learning_status = EXCLUDED.learning_status,
			updated_at = NOW()
	`,
		m.NormalizedPath, rolesJSON, m.TotalRequests, m.LearningStatus,
	)
	return err
}

// UpsertMappings upserts multiple endpoint mappings in a transaction.
func (r *MappingRepository) UpsertMappings(ctx context.Context, mappings []*EndpointMapping) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, m := range mappings {
		rolesJSON, _ := json.Marshal(m.AllowedRoles)
		_, err := tx.Exec(ctx, `
			INSERT INTO endpoint_mappings (normalized_path, allowed_roles, total_requests, learning_status, auto_generated, updated_at)
			VALUES ($1, $2, $3, $4, TRUE, NOW())
			ON CONFLICT (normalized_path) DO UPDATE SET
				allowed_roles = EXCLUDED.allowed_roles,
				total_requests = EXCLUDED.total_requests,
				learning_status = EXCLUDED.learning_status,
				updated_at = NOW()
		`,
			m.NormalizedPath, rolesJSON, m.TotalRequests, m.LearningStatus,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}
