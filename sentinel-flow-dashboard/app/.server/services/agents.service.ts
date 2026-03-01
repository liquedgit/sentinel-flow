import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../libs/prisma";
import type { Agent } from "@/generated/prisma/client";

function hashAgentToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

export async function createNewAgent(agentName: string, backenedBaseUrl: string, identityEndpoint: string, identityMapping: string): Promise<Agent> {
    const rawToken = randomBytes(32).toString("hex");

    const hashedToken = hashAgentToken(rawToken);

    const agent = await prisma.agent.create({
        data: {
            name: agentName,
            identityEndpoint: identityEndpoint,
            backendBaseUrl: backenedBaseUrl,
            identityMapping: identityMapping,
            token: hashedToken,
        }
    })
    const returnedAgent: Agent = { ...agent, token: rawToken };
    return returnedAgent;
}

export async function getAgents(): Promise<Omit<Agent, "token">[]> {
    return await prisma.agent.findMany({
        omit: {
            token: true,
        }
    });
}

export async function updateAgentHeartbeat(token: string): Promise<Agent> {

    const hashedToken = hashAgentToken(token);

    return await prisma.agent.update({
        where: {
            token: hashedToken,
        },
        data: {
            lastHeartbeat: new Date(),
        }
    });
}

export async function deleteAgentById(id: string): Promise<Agent> {
    return await prisma.agent.delete({
        where: {
            id: id,
        }
    });
}

export async function updateAgentById(id: string, agentName: string, identityEndpoint: string, backendBaseUrl: string, identityMapping: string): Promise<Agent> {
    return await prisma.agent.update({
        where: {
            id: id,
        },
        data: {
            name: agentName,
            identityEndpoint: identityEndpoint,
            backendBaseUrl: backendBaseUrl,
            identityMapping: identityMapping
        },
    });
}