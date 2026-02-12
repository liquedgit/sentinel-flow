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