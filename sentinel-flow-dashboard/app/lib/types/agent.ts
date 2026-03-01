// types/agent.ts
import type { Agent as PrismaAgent } from "@/generated/prisma/client";

export type Agent = Omit<PrismaAgent, "identityMapping"> & {
    identityMapping: IdentityMapping;
};
export type IdentityMappingField = {
    source: "identity_response" | "request_header" | "token_claim";
    path: string;
    required?: boolean;
    default?: unknown;
};

export type IdentityMapping = {
    userId: IdentityMappingField;
    role: IdentityMappingField;
    permissions?: IdentityMappingField;
    [key: string]: IdentityMappingField | undefined;
};

