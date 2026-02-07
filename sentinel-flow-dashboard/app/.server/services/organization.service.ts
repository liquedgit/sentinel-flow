import type { Organization } from "@/generated/prisma/client";
import { prisma } from "../libs/prisma";

export async function createOrganizationService(organizationName: string): Promise<Organization | null> {
    return await prisma.organization.create({
        data: {
            organizationName: organizationName,
        },
    });
}

export async function getCountOrganizationsService(): Promise<number> {
    return await prisma.organization.count();
}
