import { updateAgentHeartbeat } from "~/.server/services/agents.service";
import type { Route } from "./+types/agents.api.events";
import { produceAccessEvent } from "~/.server/libs/kafka";


interface UserRequestEvent {
    user_id: string;
    role: string;
}

export interface AccessEventPayload {
    trace_id: string;
    method: string;
    path: string;
    query?: string;
    client_ip: string;
    status: number;
    auth_present: boolean;
    user_attr: UserRequestEvent | null;
    timestamp: string;
}


export async function action({ request }: Route.ActionArgs) {
    if (request.method !== "POST") {
        return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    console.log("token before", token);
    if (!token || token.length <= 6) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("token", token);
    const agent = await updateAgentHeartbeat(token);
    if (!agent) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let event: AccessEventPayload;
    try {
        event = (await request.json()) as AccessEventPayload;
    } catch {
        return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Only produce to Kafka when the request carried a resolved identity.
    // Unauthenticated traffic is still acknowledged – the agent must never
    // be blocked waiting for a response.
    if (event.auth_present && event.user_attr) {
        try {
            await produceAccessEvent(event, agent.id);
        } catch (err) {
            // Log but do not fail the request – the agent should not retry on
            // Kafka errors; those are an internal concern of the Dashboard.
            console.error("[Events] Failed to produce Kafka event:", err);
        }
    }

    return Response.json(
        { data: { message: "Event received" }, status: 200, success: true },
        { status: 200 }
    );
}

export async function loader({ request }: Route.LoaderArgs) {
    return Response.json({ error: "Method not allowed" }, { status: 405 })
}