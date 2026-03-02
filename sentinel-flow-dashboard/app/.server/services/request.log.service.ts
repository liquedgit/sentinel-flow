import type { RequestLog } from "@/generated/prisma/client";
import { prisma } from "../libs/prisma";

export async function getRequestLogs(): Promise<RequestLog[]> {
    return await prisma.requestLog.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
}

export async function getRequestLogById(id: number): Promise<RequestLog | null> {
    return await prisma.requestLog.findUnique({
        where: {
            id: id,
        },
    });
}

export async function getRequestLogsByNormalizedPath(
    normalizedPath: string,
    limit = 10
): Promise<RequestLog[]> {
    return await prisma.requestLog.findMany({
        where: { normalizedPath },
        orderBy: { timestamp: "desc" },
        take: limit,
    });
}

export async function getRequestLogsByRole(
    role: string,
    limit = 10
): Promise<RequestLog[]> {
    return await prisma.requestLog.findMany({
        where: { role },
        orderBy: { timestamp: "desc" },
        take: limit,
    });
}