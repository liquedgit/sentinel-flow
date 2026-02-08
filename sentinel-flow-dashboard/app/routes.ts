import { type RouteConfig, index, prefix, route, layout } from "@react-router/dev/routes";

const BASE_PATH = "./routes";

export default [
    // index (/) route

    // AUTHENTICATED ONLY ROUTES
    layout(BASE_PATH + "/dashboard/layout.tsx", [
        index(BASE_PATH + "/dashboard/dashboard.page.tsx"),
    ]),
    // auth prefixed routes under /auth
    ...prefix("auth", [
        layout(BASE_PATH + "/auth/layout.tsx", [
            route("login", BASE_PATH + "/auth/login.page.tsx"),
            route("root", BASE_PATH + "/auth/register.root.page.tsx"),
        ]),
    ]),
] satisfies RouteConfig;
