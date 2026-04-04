import type { RequestLog } from "@/generated/prisma/client";
import { prisma } from "../libs/prisma";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export type RequestLogListRow = {
    id: string;
    timestamp: string;
    method: string;
    path: string;
    normalizedPath: string | null;
    userId: string | null;
    role: string | null;
    clientIp: string | null;
    status: number | null;
    traceId: string | null;
};

export async function getRequestLogsPaginated(
    page: number,
    pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<{ rows: RequestLogListRow[]; total: number; page: number; pageSize: number }> {
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(
        MAX_PAGE_SIZE,
        Math.max(1, Math.floor(pageSize)),
    );

    const total = await prisma.requestLog.count();
    const totalPages = Math.max(1, Math.ceil(total / safeSize));
    const clampedPage = Math.min(safePage, totalPages);
    const skip = (clampedPage - 1) * safeSize;

    const raw = await prisma.requestLog.findMany({
        orderBy: { timestamp: "desc" },
        skip,
        take: safeSize,
        select: {
            id: true,
            timestamp: true,
            method: true,
            path: true,
            normalizedPath: true,
            userId: true,
            role: true,
            clientIp: true,
            status: true,
            traceId: true,
        },
    });

    const rows: RequestLogListRow[] = raw.map((r) => ({
        id: r.id.toString(),
        timestamp: r.timestamp.toISOString(),
        method: r.method,
        path: r.path,
        normalizedPath: r.normalizedPath,
        userId: r.userId,
        role: r.role,
        clientIp: r.clientIp,
        status: r.status,
        traceId: r.traceId,
    }));

    return { rows, total, page: clampedPage, pageSize: safeSize };
}

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