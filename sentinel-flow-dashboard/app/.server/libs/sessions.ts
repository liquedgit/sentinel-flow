import { createCookieSessionStorage } from "react-router";

type SessionData = {
    userId: string;
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
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: "/",
                sameSite: "lax",
                secrets: [process.env.SESSION_SECRET as string],
                secure: true,
            },
        },
    );

export { getSession, commitSession, destroySession };
