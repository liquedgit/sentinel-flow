-- IDOR Detection: Add violation_type column to violations table
-- Values: 'vertical_idor' (RBAC violations) or 'horizontal_idor' (resource ownership violations)
ALTER TABLE "violations" ADD COLUMN "violation_type" VARCHAR(20) NOT NULL DEFAULT 'vertical_idor';
ALTER TABLE "violations" ADD CONSTRAINT "violations_violation_type_check" CHECK ("violation_type" IN ('vertical_idor', 'horizontal_idor'));

-- Add resource_id column to violations table (for horizontal IDOR violations)
ALTER TABLE "violations" ADD COLUMN "resource_id" VARCHAR(255);

-- Add expected_users column to violations table (for horizontal IDOR violations - owner user IDs)
ALTER TABLE "violations" ADD COLUMN "expected_users" JSONB;

-- CreateIndex for violation_type
CREATE INDEX "idx_violations_violation_type" ON "violations"("violation_type");

-- CreateIndex for Horizontal IDOR-specific lookups
CREATE INDEX "idx_violations_horizontal_idor_lookup" ON "violations"("normalized_path", "resource_id") WHERE "violation_type" = 'horizontal_idor';

-- Create user_resource_mappings table for Horizontal IDOR detection
-- This table tracks which user owns which specific resource IDs
CREATE TABLE "user_resource_mappings" (
    "id" SERIAL PRIMARY KEY,
    "normalized_path" VARCHAR(500) NOT NULL,
    "resource_id" VARCHAR(255) NOT NULL,
    "owner_user_id" VARCHAR(255) NOT NULL,
    "first_access_time" TIMESTAMPTZ NOT NULL,
    "last_access_time" TIMESTAMPTZ NOT NULL,
    "access_count" INTEGER NOT NULL DEFAULT 1,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "user_resource_mappings_unique_resource" UNIQUE ("normalized_path", "resource_id")
);

-- CreateIndex for confirmed mappings lookup
CREATE INDEX "idx_user_resource_mappings_confirmed" ON "user_resource_mappings"("confirmed", "normalized_path");

-- CreateIndex for resource lookup
CREATE INDEX "idx_user_resource_mappings_lookup" ON "user_resource_mappings"("normalized_path", "resource_id");

-- IDOR Detection: Insert configuration entries
INSERT INTO "configurations" ("key", "value", "updated_by") VALUES
('idor.confirmation_threshold', '3', 'system'),
('idor.learning_window_days', '90', 'system'),
('idor.enabled', 'true', 'system')
ON CONFLICT ("key") DO NOTHING;
