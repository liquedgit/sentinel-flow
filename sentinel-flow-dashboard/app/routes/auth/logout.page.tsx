import { destroySession, getSessionFromRequest } from "~/.server/libs/sessions";
import type { Route } from "./+types/logout.page";
import { redirect } from "react-router";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return redirect("/");
  }

  const session = await getSessionFromRequest(request);
  return redirect("/auth/login", {
    headers: { "Set-Cookie": await destroySession(session) },
  });
}
