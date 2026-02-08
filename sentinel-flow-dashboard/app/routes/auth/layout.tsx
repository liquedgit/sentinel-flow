import { Outlet, redirect } from "react-router";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/layout";
import { getSessionFromRequest } from "~/.server/libs/sessions";
import { guestMidleware } from "~/.server/middlewares/auth.middleware";

export const middleware: Route.MiddlewareFunction[] = [guestMidleware];

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSessionFromRequest(request);
  if (session.has("userId")) {
    return redirect("/");
  }
  return null;
}

export default function AuthLayout() {
  return (
    <div
      className={cn(
        "min-h-screen w-full bg-linear-to-br from-slate-950 via-slate-900 to-slate-950",
        "flex items-center justify-center p-4 relative overflow-hidden",
      )}
    >
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-size-[50px_50px]" />
      <div className="absolute inset-0 bg-linear-to-t from-slate-950 via-transparent to-transparent" />

      {/* Glow effects */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
