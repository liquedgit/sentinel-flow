import type { Prisma, Violation } from "@/generated/prisma/client";
import { prisma } from "../libs/prisma";

export type ViolationWithRequestLog =
    Prisma.ViolationGetPayload<{ include: { requestLog: true } }>;


export async function getViolations(): Promise<ViolationWithRequestLog[]> {
    return await prisma.violation.findMany({
        orderBy: {
            createdAt: "desc",
        },
        include: {
            requestLog: true
        },
    });
}

export async function getViolationById(
    id: number
): Promise<ViolationWithRequestLog | null> {
    return await prisma.violation.findUnique({
        where: { id },
        include: { requestLog: true },
    });
}

