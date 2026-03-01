import { data } from "react-router";
import type { Route } from "./+types/agents.$id";
import { deleteAgentById, updateAgentById } from "~/.server/services/agents.service";
import type { BaseResponseDtoWithData } from "~/lib/types/dto/base.dto";
import type { Agent, IdentityMapping } from "~/lib/types/agent";

export async function action({ request, params }: Route.ActionArgs) {

    const id = params.id as string;

    if (request.method === "PATCH") {
        const formData = await request.formData();
        const agentName = String(formData.get("agentName"));
        const identityEndpoint = String(formData.get("identityEndpoint"));
        const backendBaseUrl = String(formData.get("backendBaseUrl"));
        const identityMapping = String(formData.get("identityMapping"));
        const agent = await updateAgentById(id, agentName, identityEndpoint, backendBaseUrl, identityMapping);
        const res: BaseResponseDtoWithData<Agent> = {
            data: {
                ...agent,
                identityMapping: JSON.parse(
                    agent.identityMapping?.toString() || "{}",
                ) as IdentityMapping,
            },
            status: 200,
            success: true,
        };
        return data(res, { status: 200 });
    }

    if (request.method === "DELETE") {
        const agent = await deleteAgentById(id);

        return data({
            message: "Agent deleted successfully",
            status: 200,
            success: true,
        }, { status: 200 });
    }

    return data({
        message: "Method not supported",
        status: 405,
        success: false,
    }, { status: 405 });
}