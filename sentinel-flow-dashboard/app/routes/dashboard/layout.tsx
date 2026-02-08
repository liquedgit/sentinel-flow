import { Outlet, data, useLoaderData } from "react-router";
import type { Route } from "./+types/dashboard.page";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/appsidebar";
import { getOrganizationService } from "~/.server/services/organization.service";
import { authMiddleware } from "~/.server/middlewares/auth.middleware";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader() {
  const organization = await getOrganizationService();
  return data(organization?.organizationName, { status: 200 });
}

export default function AuthLayout() {
  const organization = useLoaderData<typeof loader>();
  return (
    <SidebarProvider>
      <AppSidebar organization={organization ?? ""} />

      <main>
        <SidebarTrigger />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
