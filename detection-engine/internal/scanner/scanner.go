package scanner

import (
	"context"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

// ScanParams holds configurable parameters for a scan run.
type ScanParams struct {
	LearningWindowDays    int
	ViolationThresholdPct float64
	MinimumSampleSize     int
}

// Scanner runs the learning algorithm to compute endpoint mappings from request logs.
type Scanner struct {
	pool        *pgxpool.Pool
	mappingRepo *repository.MappingRepository
	cache       *cache.MappingCache
}

// New creates a new Scanner.
func New(pool *pgxpool.Pool, mappingRepo *repository.MappingRepository, cache *cache.MappingCache) *Scanner {
	return &Scanner{
		pool:        pool,
		mappingRepo: mappingRepo,
		cache:       cache,
	}
}

// Scan executes the scan: queries request_logs, computes mappings, upserts to DB, refreshes cache.
func (s *Scanner) Scan(ctx context.Context, params ScanParams) error {
	rows, err := s.pool.Query(ctx, `
		WITH endpoint_stats AS (
			SELECT 
				normalized_path,
				role,
				COUNT(*) as role_count,
				COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY normalized_path) as percentage,
				SUM(COUNT(*)) OVER (PARTITION BY normalized_path) as total_requests
			FROM request_logs
			WHERE timestamp > NOW() - INTERVAL '1 day' * $1
				AND role IS NOT NULL
				AND normalized_path IS NOT NULL
			GROUP BY normalized_path, role
		)
		SELECT normalized_path, role, role_count, percentage, total_requests
		FROM endpoint_stats
		WHERE total_requests >= $2
		ORDER BY normalized_path, percentage DESC
	`, params.LearningWindowDays, params.MinimumSampleSize)
	if err != nil {
		return err
	}
	defer rows.Close()

	// Group by normalized path, filter roles by threshold
	pathRoles := make(map[string]map[string]int64) // normalized_path -> role -> total_requests
	pathTotals := make(map[string]int64)

	for rows.Next() {
		var row repository.EndpointStatsRow
		if err := rows.Scan(&row.NormalizedPath, &row.Role, &row.RoleCount, &row.Percentage, &row.TotalRequests); err != nil {
			return err
		}
		if pathRoles[row.NormalizedPath] == nil {
			pathRoles[row.NormalizedPath] = make(map[string]int64)
			pathTotals[row.NormalizedPath] = row.TotalRequests
		}
		if row.Percentage >= params.ViolationThresholdPct {
			pathRoles[row.NormalizedPath][row.Role] = row.RoleCount
		}
	}
	if err := rows.Err(); err != nil {
		return err
	}

	// Build mappings for upsert
	var mappings []*repository.EndpointMapping
	for normalizedPath, roles := range pathRoles {
		allowedRoles := make([]string, 0, len(roles))
		for r := range roles {
			allowedRoles = append(allowedRoles, r)
		}
		if len(allowedRoles) > 0 {
			mappings = append(mappings, &repository.EndpointMapping{
				NormalizedPath: normalizedPath,
				AllowedRoles:   allowedRoles,
				TotalRequests:  pathTotals[normalizedPath],
				LearningStatus: "active",
			})
		}
	}

	if err := s.mappingRepo.UpsertMappings(ctx, mappings); err != nil {
		return err
	}

	// Refresh cache
	cacheMappings := make(map[string][]string)
	for _, m := range mappings {
		cacheMappings[m.NormalizedPath] = m.AllowedRoles
	}
	s.cache.Refresh(cacheMappings)

	slog.Info("scan completed", "endpoints_scanned", len(mappings), "mappings_updated", len(mappings))
	return nil
}
