import { updateAgentHeartbeat } from "~/.server/services/agents.service";
import type { Route } from "./+types/agents.api.heartbeat";

export async function action({ request }: Route.ActionArgs) {
    if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const agent = await updateAgentHeartbeat(token);
    if (!agent) {
        return Response.json({ error: "Agent not found" }, { status: 404 });
    }
    return Response.json({ message: "Heartbeat received" }, { status: 200 });
}