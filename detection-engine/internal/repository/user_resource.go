package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UserResourceRepository handles persistence of user resource mappings for IDOR detection.
type UserResourceRepository struct {
	pool *pgxpool.Pool
}

// NewUserResourceRepository creates a new UserResourceRepository.
func NewUserResourceRepository(pool *pgxpool.Pool) *UserResourceRepository {
	return &UserResourceRepository{pool: pool}
}

// UpsertMapping inserts or updates a single resource mapping.
func (r *UserResourceRepository) UpsertMapping(ctx context.Context, m *UserResourceMapping) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO user_resource_mappings
		(normalized_path, resource_id, owner_user_id, first_access_time, last_access_time, access_count, confirmed)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (normalized_path, resource_id)
		DO UPDATE SET
			owner_user_id = EXCLUDED.owner_user_id,
			access_count = EXCLUDED.access_count,
			last_access_time = EXCLUDED.last_access_time,
			confirmed = user_resource_mappings.confirmed,
			updated_at = NOW()
	`, m.NormalizedPath, m.ResourceID, m.OwnerUserID, m.FirstAccessTime,
		m.LastAccessTime, m.AccessCount, m.Confirmed)
	return err
}

// UpsertMappings bulk inserts or updates multiple resource mappings.
func (r *UserResourceRepository) UpsertMappings(ctx context.Context, mappings []*UserResourceMapping) error {
	if len(mappings) == 0 {
		return nil
	}

	batch := &pgx.Batch{}
	for _, m := range mappings {
		batch.Queue(`
			INSERT INTO user_resource_mappings
			(normalized_path, resource_id, owner_user_id, first_access_time, last_access_time, access_count, confirmed)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (normalized_path, resource_id)
			DO UPDATE SET
				owner_user_id = EXCLUDED.owner_user_id,
				access_count = EXCLUDED.access_count,
				last_access_time = EXCLUDED.last_access_time,
				confirmed = user_resource_mappings.confirmed,
				updated_at = NOW()
		`, m.NormalizedPath, m.ResourceID, m.OwnerUserID, m.FirstAccessTime,
			m.LastAccessTime, m.AccessCount, m.Confirmed)
	}

	return r.pool.SendBatch(ctx, batch).Close()
}

// LoadConfirmedMappings loads all confirmed resource mappings from the database.
func (r *UserResourceRepository) LoadConfirmedMappings(ctx context.Context) ([]*UserResourceMapping, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, normalized_path, resource_id, owner_user_id,
		       first_access_time, last_access_time, access_count, confirmed
		FROM user_resource_mappings
		WHERE confirmed = true
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []*UserResourceMapping
	for rows.Next() {
		var m UserResourceMapping
		if err := rows.Scan(&m.ID, &m.NormalizedPath, &m.ResourceID, &m.OwnerUserID,
			&m.FirstAccessTime, &m.LastAccessTime, &m.AccessCount, &m.Confirmed); err != nil {
			return nil, err
		}
		mappings = append(mappings, &m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return mappings, nil
}

// LoadAllMappings loads all resource mappings (including unconfirmed) from the database.
func (r *UserResourceRepository) LoadAllMappings(ctx context.Context) ([]*UserResourceMapping, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, normalized_path, resource_id, owner_user_id,
		       first_access_time, last_access_time, access_count, confirmed
		FROM user_resource_mappings
		ORDER BY normalized_path, resource_id
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mappings []*UserResourceMapping
	for rows.Next() {
		var m UserResourceMapping
		if err := rows.Scan(&m.ID, &m.NormalizedPath, &m.ResourceID, &m.OwnerUserID,
			&m.FirstAccessTime, &m.LastAccessTime, &m.AccessCount, &m.Confirmed); err != nil {
			return nil, err
		}
		mappings = append(mappings, &m)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return mappings, nil
}

// GetMapping retrieves a specific resource mapping by path and resource ID.
func (r *UserResourceRepository) GetMapping(ctx context.Context, normalizedPath, resourceID string) (*UserResourceMapping, error) {
	var m UserResourceMapping
	err := r.pool.QueryRow(ctx, `
		SELECT id, normalized_path, resource_id, owner_user_id,
		       first_access_time, last_access_time, access_count, confirmed
		FROM user_resource_mappings
		WHERE normalized_path = $1 AND resource_id = $2
	`, normalizedPath, resourceID).Scan(
		&m.ID, &m.NormalizedPath, &m.ResourceID, &m.OwnerUserID,
		&m.FirstAccessTime, &m.LastAccessTime, &m.AccessCount, &m.Confirmed,
	)

	if err != nil {
		return nil, err
	}

	return &m, nil
}
