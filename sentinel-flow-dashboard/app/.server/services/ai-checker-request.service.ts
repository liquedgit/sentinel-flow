import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "../libs/prisma";
import { produceCheckRequest, type CheckRequestPayload } from "../libs/kafka";
import { getViolationById } from "./violation.service";

const PROJECT_NAME = "example_project";

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

/** Thrown when the latest AI checker request for this finding is not failed (running or complete). */
export class DuplicateAICheckerRequestError extends Error {
  constructor() {
    super("Analysis already in progress or completed for this finding");
    this.name = "DuplicateAICheckerRequestError";
  }
}

export type AICheckerRequestWithViolation = Prisma.AICheckerRequestGetPayload<{
  include: { violation: true };
}>;

export async function getAICheckerRequests(): Promise<
  AICheckerRequestWithViolation[]
> {
  return prisma.aICheckerRequest.findMany({
    include: { violation: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAICheckerRequest(violationId: number): Promise<{
  id: string;
  status: string;
}> {
  const violation = await getViolationById(violationId);
  if (!violation) {
    throw new Error("Violation not found");
  }
  if (!violation.requestLog) {
    throw new Error("Violation has no associated request log");
  }

  const requestId = crypto.randomUUID();
  const violationType = (violation.violationType as string) || 'vertical_idor';
  const endpoint = violation.normalizedPath;
  const method = violation.requestLog.method;

  // Build payload based on violation type
  const payload: CheckRequestPayload = {
    request_id: requestId,
    project_name: PROJECT_NAME,
    method,
    endpoint,
    violation_type: violationType as 'vertical_idor' | 'horizontal_idor',
  };

  // Vertical IDOR (RBAC) specific fields
  if (violationType === 'vertical_idor') {
    (payload as any).prohibited_roles = violation.role ? [violation.role] : [];
  }

  // Horizontal IDOR specific fields
  if (violationType === 'horizontal_idor') {
    (payload as any).resource_id = violation.resourceId || undefined;
    (payload as any).owner_user_id = Array.isArray(violation.expectedUsers) && violation.expectedUsers.length > 0
      ? String(violation.expectedUsers[0])
      : undefined;
    (payload as any).accessing_user_id = violation.userId || undefined;
  }

  const record = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM violations WHERE id = ${violationId} FOR UPDATE`
    );
    const latest = await tx.aICheckerRequest.findFirst({
      where: { violationId },
      orderBy: { createdAt: "desc" },
    });
    if (latest != null && latest.status !== "failed") {
      throw new DuplicateAICheckerRequestError();
    }
    return tx.aICheckerRequest.create({
      data: {
        id: requestId,
        violationId,
        status: "running",
      },
    });
  });

  try {
    await produceCheckRequest(payload);
    return { id: record.id, status: record.status };
  } catch (err) {
    await prisma.aICheckerRequest.update({
      where: { id: requestId },
      data: { status: "failed" },
    });
    throw err;
  }
}
