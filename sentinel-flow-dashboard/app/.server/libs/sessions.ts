import { createCookieSessionStorage } from "react-router";

type SessionData = {
    userId: string;
    expiresAt: Date;
};

type SessionFlashData = {
    error: string;
};

const { getSession, commitSession, destroySession } =
    createCookieSessionStorage<SessionData, SessionFlashData>(
        {
            cookie: {
                name: "__sfsession",
                httpOnly: true,
                maxAge: 60 * 60 * 24 * 5, // 5 days
                path: "/",
                sameSite: "lax",
                secrets: [process.env.SESSION_SECRET as string],
                secure: true,
            },
        },
    );

async function getSessionInternal(request: Request) {
    const session = await getSession(request.headers.get("Cookie"));
    return session;
}

export async function getSessionFromRequest(request: Request) {
    const session = await getSessionInternal(request);
    return session;
}

export async function commitSessionForAuthenticatedUser(request: Request, userId: string) {
    const session = await getSessionInternal(request);
    session.set("userId", userId);
    return await commitSession(session);
}

export { commitSession, destroySession };
