import { updateAgentHeartbeat } from "~/.server/services/agents.service";
import type { Route } from "./+types/agents.api.config";

export async function loader({ request }: Route.LoaderArgs) {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
}

export async function action({ request }: Route.ActionArgs) {
    if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token || token.length <= 0) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const agent = await updateAgentHeartbeat(token);
    if (!agent) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json({
        data: {
            identityEndpoint: agent.identityEndpoint,
            backendBaseUrl: agent.backendBaseUrl,
            identityMapping: agent.identityMapping,
        },
        status: 200,
        success: true,
    }, { status: 200 });
}