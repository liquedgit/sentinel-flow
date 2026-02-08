import { RouterContextProvider, redirect } from "react-router";
import { commitSession, destroySession, getSessionFromRequest } from "../libs/sessions";
import { getUserByIdService } from "../services/user.service";
import { userContext } from "../libs/context";
import { getOrganizationService } from "../services/organization.service";


export async function authMiddleware({ request, context }: { request: Request, context: Readonly<RouterContextProvider> }) {
    const session = await getSessionFromRequest(request);
    if (!session.has("userId")) {
        throw redirect("/auth/login", {
            headers: { "Set-Cookie": await commitSession(session) },
        });
    }

    const user = await getUserByIdService(session.get("userId") as string);

    if (!user) {
        throw redirect("/auth/login", {
            headers: { "Set-Cookie": await destroySession(session) },
        });
    }

    context.set(userContext, session.get("userId") as string);
}

export async function guestMidleware({ request }: { request: Request }) {
    const session = await getSessionFromRequest(request);
    const requestPath = request.url.split("/").pop();
    const organization = await getOrganizationService();

    if (requestPath === "root" && organization) {
        throw redirect("/auth/login", {
            headers: { "Set-Cookie": await commitSession(session) },
        });
    }

    if (session.has("userId")) {
        throw redirect("/", {
            headers: { "Set-Cookie": await commitSession(session) },
        });
    }

}

export async function firstTimeSetupMiddleware({ request }: { request: Request }) {
    const organization = await getOrganizationService();
    const requestPath = request.url.split("/").pop();
    const session = await getSessionFromRequest(request);
    if (!organization && requestPath !== "root") {
        throw redirect("/auth/root", {
            headers: { "Set-Cookie": await commitSession(session) },
        });
    }

}