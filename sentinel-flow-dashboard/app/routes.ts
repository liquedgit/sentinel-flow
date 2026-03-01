import { type RouteConfig, index, prefix, route, layout } from "@react-router/dev/routes";

const BASE_PATH = "./routes";

export default [
    // index (/) route

    // AUTHENTICATED ONLY ROUTES
    layout(BASE_PATH + "/layout.tsx", [
        index(BASE_PATH + "/dashboard/dashboard.page.tsx"),
        route("findings", BASE_PATH + "/findings/findings.page.tsx"),
        route("authorization-graph-explorer", BASE_PATH + "/authorization-graph-explorer/authorization-graph-explorer.page.tsx"),
        route("learn-mappping", BASE_PATH + "/learn-mapping/learn-mapping.page.tsx"),
        route("agents", BASE_PATH + "/agents/agents.page.tsx"),
        route("agents/:id", BASE_PATH + "/agents/agents.$id.ts")
    ]),
    // auth prefixed routes under /auth
    ...prefix("auth", [
        layout(BASE_PATH + "/auth/layout.tsx", [
            route("login", BASE_PATH + "/auth/login.page.tsx"),
            route("root", BASE_PATH + "/auth/register.root.page.tsx"),
        ]),
        route("logout", BASE_PATH + "/auth/logout.page.tsx"),
    ]),

    ...prefix("api", [
        ...prefix("agents", [
            route("heartbeat", BASE_PATH + "/agents/agents.api.heartbeat.ts"),
        ]),
    ])
] satisfies RouteConfig;
