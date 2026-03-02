import { prisma } from "../libs/prisma";
import { produceCheckRequest } from "../libs/kafka";
import { getViolationById } from "./violation.service";

const PROJECT_NAME = "example_project";

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
  const prohibitedRoles = violation.role ? [violation.role] : [];
  const endpoint = violation.normalizedPath;
  const method = violation.requestLog.method;

  const record = await prisma.aICheckerRequest.create({
    data: {
      id: requestId,
      violationId,
      status: "running",
    },
  });

  try {
    await produceCheckRequest({
      request_id: requestId,
      project_name: PROJECT_NAME,
      method,
      endpoint,
      prohibited_roles: prohibitedRoles,
    });
    return { id: record.id, status: record.status };
  } catch (err) {
    await prisma.aICheckerRequest.update({
      where: { id: requestId },
      data: { status: "failed" },
    });
    throw err;
  }
}
