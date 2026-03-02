import type { Route } from "./+types/request-logs.resource";
import { data } from "react-router";
import {
    getRequestLogsByNormalizedPath,
    getRequestLogsByRole,
} from "~/.server/services/request.log.service";

export async function loader({ request }: Route.LoaderArgs) {
    const url = new URL(request.url);
    const type = url.searchParams.get("type"); // "endpoint" | "role"
    const value = url.searchParams.get("value");

    if (!type || !value) {
        return data({ logs: [] }, { status: 200 });
    }

    if (type === "endpoint") {
        const logs = await getRequestLogsByNormalizedPath(value, 10);
        return data({ logs }, { status: 200 });
    }

    if (type === "role") {
        const logs = await getRequestLogsByRole(value, 10);
        return data({ logs }, { status: 200 });
    }

    return data({ logs: [] }, { status: 200 });
}
