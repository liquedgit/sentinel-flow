import { type RouteConfig, index, prefix, route, layout } from "@react-router/dev/routes";

const BASE_PATH = "./routes";

export default [
    // index (/) route
    index(BASE_PATH + "/_index.tsx"),

    // auth prefixed routes under /auth
    ...prefix("auth", [
        layout(BASE_PATH + "/auth/layout.tsx", [
            route("login", BASE_PATH + "/auth/login.tsx"),
            route("root", BASE_PATH + "/auth/register-root.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
