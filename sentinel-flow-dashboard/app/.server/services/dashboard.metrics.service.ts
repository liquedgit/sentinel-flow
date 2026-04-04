import { differenceInMinutes } from "date-fns";
import { prisma } from "../libs/prisma";
import {
  AGENT_ONLINE_THRESHOLD_MINUTES,
  type RequestLogDailyCount,
} from "~/lib/dashboard";

export function isAgentOnline(lastHeartbeat: Date | null): boolean {
  if (!lastHeartbeat) return false;
  return differenceInMinutes(lastHeartbeat, new Date()) >= -AGENT_ONLINE_THRESHOLD_MINUTES;
}

export type DashboardMetrics = {
  requestLogsByDay: RequestLogDailyCount[];
  userResourceMappingCount: number;
  rbacMappingCount: number;
  findingsResolved: number;
  findingsOpen: number;
  agentsTotal: number;
  agentsActive: number;
  agentsInactive: number;
};

function buildLastNDaysKeys(n: number): { dateKey: string; label: string }[] {
  const out: { dateKey: string; label: string }[] = [];
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const day = now.getUTCDate();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(y, m, day - i));
    const dateKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    out.push({ dateKey, label });
  }
  return out;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const dayKeys = buildLastNDaysKeys(30);
  const rangeStart = new Date(`${dayKeys[0]!.dateKey}T00:00:00.000Z`);

  const [dailyRows, userResourceMappingCount, rbacMappingCount, violationGroups, agents] =
    await Promise.all([
      prisma.$queryRaw<{ d: Date; c: bigint }[]>`
        SELECT DATE("timestamp") AS d, COUNT(*)::bigint AS c
        FROM request_logs
        WHERE "timestamp" >= ${rangeStart}
        GROUP BY DATE("timestamp")
        ORDER BY DATE("timestamp")
      `,
      prisma.userResourceMapping.count(),
      prisma.endpointRoleMapping.count(),
      prisma.violation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.agent.findMany({
        omit: { token: true },
      }),
    ]);

  const countByDay = new Map<string, number>();
  for (const row of dailyRows) {
    const key =
      row.d instanceof Date
        ? row.d.toISOString().slice(0, 10)
        : String(row.d).slice(0, 10);
    countByDay.set(key, Number(row.c));
  }

  const requestLogsByDay: RequestLogDailyCount[] = dayKeys.map(({ dateKey, label }) => ({
    dateKey,
    label,
    count: countByDay.get(dateKey) ?? 0,
  }));

  let findingsResolved = 0;
  let findingsOpen = 0;
  const resolvedStatuses = new Set(["resolved", "acknowledged"]);
  for (const g of violationGroups) {
    const n = g._count._all;
    if (resolvedStatuses.has(g.status.toLowerCase())) {
      findingsResolved += n;
    } else {
      findingsOpen += n;
    }
  }

  const agentsTotal = agents.length;
  let agentsActive = 0;
  for (const a of agents) {
    if (isAgentOnline(a.lastHeartbeat)) agentsActive += 1;
  }
  const agentsInactive = agentsTotal - agentsActive;

  return {
    requestLogsByDay,
    userResourceMappingCount,
    rbacMappingCount,
    findingsResolved,
    findingsOpen,
    agentsTotal,
    agentsActive,
    agentsInactive,
  };
}
