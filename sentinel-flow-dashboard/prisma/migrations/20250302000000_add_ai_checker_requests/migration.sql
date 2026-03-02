-- CreateTable
CREATE TABLE "ai_checker_requests" (
    "id" TEXT NOT NULL,
    "violation_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "is_violation" BOOLEAN,
    "description" TEXT,
    "short_description" VARCHAR(500),
    "impact" TEXT,
    "recommendation_fix" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_checker_requests_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ai_checker_requests" ADD CONSTRAINT "ai_checker_requests_violation_id_fkey" FOREIGN KEY ("violation_id") REFERENCES "violations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
