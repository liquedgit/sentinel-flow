import { prisma } from "../libs/prisma";

export async function createNewAgent(agentName: string, backenedBaseUrl : string, identityEndpoint: string){
    const agent = await prisma.agent.create({
        data:{
            name: agentName,
            identityEndpoint: identityEndpoint,
            backendBaseUrl: backenedBaseUrl,
        }
    })
}