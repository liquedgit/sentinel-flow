import type { UserResourceMapping } from "@/generated/prisma/client";
import { prisma } from "../libs/prisma";

export async function getUserResourceMappingsService(): Promise<
  UserResourceMapping[]
> {
  return prisma.userResourceMapping.findMany({
    orderBy: { lastAccessTime: "desc" },
    take: 5000,
  });
}

export async function confirmUserResourceMapping(id: number) {
  return prisma.userResourceMapping.update({
    where: { id },
    data: { confirmed: true },
  });
}
