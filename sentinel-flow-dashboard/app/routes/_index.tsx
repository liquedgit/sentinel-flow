import { redirect } from "react-router";
import type { Route } from "../+types/root";
import { getCountOrganizationsService } from "~/.server/services/organization.service";
import { commitSession, getSession } from "~/.server/libs/sessions";

// This runs on the SERVER before rendering
export async function loader({ request }: Route.LoaderArgs) {
  // Check if user is logged in
  const session = await getSession(request.headers.get("Cookie"));
  const countOrganizations = await getCountOrganizationsService();
  if (countOrganizations <= 0) {
    return redirect("/auth/root");
  }

  if (session.has("userId")) {
    return null;
  } else {
    return redirect("/auth/login", {
      headers: { "Set-Cookie": await commitSession(session) },
    });
  }
}

export default function Index() {
  return <>Dashboard Page</>;
}
