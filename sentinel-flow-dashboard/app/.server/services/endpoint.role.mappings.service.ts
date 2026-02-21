import type { EndpointRoleMapping } from "@/generated/prisma/client";
import { prisma } from "../libs/prisma";

export async function getEndpointRoleMappingsService(): Promise<EndpointRoleMapping[]> {
    return await prisma.endpointRoleMapping.findMany({
        orderBy: {
            createdAt: "desc",
        },
    });
}