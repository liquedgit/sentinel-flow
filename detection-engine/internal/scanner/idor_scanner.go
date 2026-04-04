package scanner

import (
	"context"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/cache"
	"github.com/liquedgit/sentinel-flow/detection-engine/internal/repository"
)

// IDORScanParams holds configurable parameters for an IDOR scan run.
type IDORScanParams struct {
	LearningWindowDays        int     // How many days back to scan for learning
	ResourceDominancePercent  float64 // Min share (0-100) of accesses for the top user vs total, to create a mapping
	MinimumSampleSize         int     // Minimum total accesses per resource before learning
}

// DefaultIDORScanParams returns default parameters for IDOR scanning.
func DefaultIDORScanParams() IDORScanParams {
	return IDORScanParams{
		LearningWindowDays:       90,
		ResourceDominancePercent: 95,
		MinimumSampleSize:        2,
	}
}

// IDORScanner runs the learning algorithm to compute resource ownership from request logs.
type IDORScanner struct {
	pool   *pgxpool.Pool
	cache  *cache.ResourceCache
	repo   *repository.UserResourceRepository
}

// NewIDORScanner creates a new IDORScanner.
func NewIDORScanner(pool *pgxpool.Pool, cache *cache.ResourceCache, repo *repository.UserResourceRepository) *IDORScanner {
	return &IDORScanner{
		pool:  pool,
		cache: cache,
		repo:  repo,
	}
}

// Scan executes the IDOR scan: queries request_logs, computes resource ownership,
// upserts to DB, refreshes cache.
func (s *IDORScanner) Scan(ctx context.Context, params IDORScanParams) error {
	started := time.Now()
	slog.Info("IDOR scan started", "started_at", started.Format(time.RFC3339), "params", params)

	defer func() {
		ended := time.Now()
		slog.Info("IDOR scan ended", "ended_at", ended.Format(time.RFC3339), "duration_ms", time.Since(started).Milliseconds())
	}()

	// Query request logs to find resource access patterns
	// We only look at paths that contain :id or :uuid (normalized)
	rows, err := s.pool.Query(ctx, `
		WITH resource_access AS (
			SELECT
				normalized_path,
				CASE
					WHEN normalized_path LIKE '%:id%' OR normalized_path LIKE '%:uuid%' THEN
						regexp_replace(
							path,
							'.*(^|/)([0-9a-f-]{20,}|[0-9]+)(/|$).*',
							'\2'
						)
					ELSE NULL
				END as resource_id,
				user_id,
				COUNT(*) as access_count,
				MIN(timestamp) as first_access_time,
				MAX(timestamp) as last_access_time
			FROM request_logs
			WHERE timestamp > NOW() - INTERVAL '1 day' * $1
				AND user_id IS NOT NULL
				AND normalized_path IS NOT NULL
				AND (normalized_path LIKE '%:id%' OR normalized_path LIKE '%:uuid%')
			GROUP BY normalized_path, resource_id, user_id
			HAVING COUNT(*) >= 1
		),
		resource_stats AS (
			SELECT
				normalized_path,
				resource_id,
				user_id,
				access_count,
				first_access_time,
				last_access_time,
				SUM(access_count) OVER (PARTITION BY normalized_path, resource_id) as total_accesses
			FROM resource_access
			WHERE resource_id IS NOT NULL
				AND resource_id != ''
		)
		SELECT normalized_path, resource_id, user_id, access_count,
		       first_access_time, last_access_time, total_accesses
		FROM resource_stats
		WHERE total_accesses >= $2
		ORDER BY normalized_path, resource_id, access_count DESC
	`, params.LearningWindowDays, params.MinimumSampleSize)
	if err != nil {
		return err
	}
	defer rows.Close()

	type ResourceAccess struct {
		NormalizedPath   string
		ResourceID       string
		UserID           string
		AccessCount      int64
		FirstAccessTime  time.Time
		LastAccessTime   time.Time
		TotalAccesses    int64
	}

	var resourceAccesses []ResourceAccess
	resourceUserCounts := make(map[string]map[string]int64)

	for rows.Next() {
		var ra ResourceAccess
		if err := rows.Scan(&ra.NormalizedPath, &ra.ResourceID, &ra.UserID,
			&ra.AccessCount, &ra.FirstAccessTime, &ra.LastAccessTime, &ra.TotalAccesses); err != nil {
			return err
		}
		resourceAccesses = append(resourceAccesses, ra)

		key := ra.NormalizedPath + ":" + ra.ResourceID
		if resourceUserCounts[key] == nil {
			resourceUserCounts[key] = make(map[string]int64)
		}
		resourceUserCounts[key][ra.UserID] = ra.AccessCount
	}
	if err := rows.Err(); err != nil {
		return err
	}

	ownerMap := make(map[string]string)
	for key, userCounts := range resourceUserCounts {
		var totalAccess int64
		for _, n := range userCounts {
			totalAccess += n
		}
		if totalAccess == 0 {
			continue
		}

		var topUser string
		var topCount int64
		tiesAtTop := 0
		for userID, count := range userCounts {
			if count > topCount {
				topCount = count
				topUser = userID
				tiesAtTop = 1
			} else if count == topCount {
				tiesAtTop++
			}
		}

		if topUser == "" || tiesAtTop != 1 {
			continue
		}

		pct := float64(topCount) * 100.0 / float64(totalAccess)
		if pct < params.ResourceDominancePercent {
			continue
		}

		ownerMap[key] = topUser
	}

	var mappings []*repository.UserResourceMapping
	for _, ra := range resourceAccesses {
		key := ra.NormalizedPath + ":" + ra.ResourceID
		owner, eligible := ownerMap[key]
		if !eligible || ra.UserID != owner {
			continue
		}

		mappings = append(mappings, &repository.UserResourceMapping{
			NormalizedPath:  ra.NormalizedPath,
			ResourceID:      ra.ResourceID,
			OwnerUserID:     ra.UserID,
			FirstAccessTime: ra.FirstAccessTime,
			LastAccessTime:  ra.LastAccessTime,
			AccessCount:     ra.AccessCount,
			// Confirmed is operator-driven (portal); scans always insert false on new rows only.
			Confirmed: false,
		})
	}

	if len(mappings) == 0 {
		slog.Info("IDOR scan completed", "resources_found", 0)
		return nil
	}

	if err := s.repo.UpsertMappings(ctx, mappings); err != nil {
		return err
	}

	allMappings, err := s.repo.LoadAllMappings(ctx)
	if err != nil {
		slog.Warn("failed to load resource mappings for cache refresh", "error", err)
	} else {
		s.cache.Refresh(allMappings)
	}

	portalConfirmed := 0
	for _, m := range allMappings {
		if m.Confirmed {
			portalConfirmed++
		}
	}

	slog.Info("IDOR scan completed", "resources_scanned", len(ownerMap),
		"mappings_updated", len(mappings), "portal_confirmed_in_cache", portalConfirmed)
	return nil
}
