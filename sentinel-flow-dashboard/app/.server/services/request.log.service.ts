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