package repository

import (
	"context"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestMappingRepository_LoadActiveMappings_and_UpsertMappings(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		t.Skip("DATABASE_URL not set, skipping integration test")
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer pool.Close()

	repo := NewMappingRepository(pool)

	// Clean up test data
	_, _ = pool.Exec(ctx, `DELETE FROM endpoint_role_mappings WHERE normalized_path LIKE '/test/%'`)

	t.Run("LoadActiveMappings_empty", func(t *testing.T) {
		result, err := repo.LoadActiveMappings(ctx)
		if err != nil {
			t.Fatalf("LoadActiveMappings: %v", err)
		}
		// May have data from other tests; we just verify it returns
		_ = result
	})

	t.Run("UpsertMappings_and_LoadActiveMappings", func(t *testing.T) {
		mappings := []*EndpointRoleMapping{
			{NormalizedPath: "/test/users/:id", AllowedRole: "admin", RequestCount: 100, Percentage: 60, Status: "active"},
			{NormalizedPath: "/test/users/:id", AllowedRole: "viewer", RequestCount: 67, Percentage: 40, Status: "active"},
			{NormalizedPath: "/test/health", AllowedRole: "admin", RequestCount: 50, Percentage: 100, Status: "active"},
		}

		if err := repo.UpsertMappings(ctx, mappings); err != nil {
			t.Fatalf("UpsertMappings: %v", err)
		}

		result, err := repo.LoadActiveMappings(ctx)
		if err != nil {
			t.Fatalf("LoadActiveMappings: %v", err)
		}

		usersRoles := result["/test/users/:id"]
		if len(usersRoles) != 2 {
			t.Errorf("LoadActiveMappings /test/users/:id: got %d roles, want 2", len(usersRoles))
		}
		rolesContain := func(s []string, r string) bool {
			for _, x := range s {
				if x == r {
					return true
				}
			}
			return false
		}
		if !rolesContain(usersRoles, "admin") || !rolesContain(usersRoles, "viewer") {
			t.Errorf("LoadActiveMappings /test/users/:id: got %v, want [admin viewer]", usersRoles)
		}

		healthRoles := result["/test/health"]
		if len(healthRoles) != 1 || healthRoles[0] != "admin" {
			t.Errorf("LoadActiveMappings /test/health: got %v, want [admin]", healthRoles)
		}
	})
}
