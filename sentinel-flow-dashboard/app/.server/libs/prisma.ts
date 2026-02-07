// app/.server/prisma.ts

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";


declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient;
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
    global.__prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    global.__prisma = prisma;
}