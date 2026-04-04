import { Outlet, data, useLoaderData, type LoaderFunctionArgs } from "react-router";
import type { Route } from "./dashboard/+types/dashboard.page";
import { SidebarProvider } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/appsidebar";
import { getOrganizationService } from "~/.server/services/organization.service";
import { authMiddleware } from "~/.server/middlewares/auth.middleware";
import { getSessionFromRequest } from "~/.server/libs/sessions";
import { getUserByIdService } from "~/.server/services/user.service";
import TopBar from "~/components/topbar";
import {
  LayoutDashboard,
  Network,
  type LucideIcon,
  Bug,
  Bot,
  Settings,
  BookText,
  ScanSearch,
  Link2,
  ScrollText,
} from "lucide-react";
import { getEndpointRoleMappingsService } from "~/.server/services/endpoint.role.mappings.service";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getSessionFromRequest(request);
  const userId = session.get("userId") as string;

  const [organization, endpointMappings, user] = await Promise.all([
    getOrganizationService(),
    getEndpointRoleMappingsService(),
    getUserByIdService(userId),
  ]);

  return data(
    {
      organizationName: organization?.organizationName,
      endpointMappingsCount: endpointMappings.length,
      currentUserEmail: user?.email ?? "",
    },
    { status: 200 },
  );
}

export interface SidebarItem {
  label: string;
  icon: LucideIcon;
  href: string;
}

const sidebarItems: SidebarItem[] = [
  {
    label: "Analytics Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "RBAC Graph Explorer",
    icon: Network,
    href: "/authorization-graph-explorer",
  },
  {
    label: "Request Logs",
    icon: ScrollText,
    href: "/request-logs",
  },
  {
    label: "Learn Mappings",
    icon: BookText,
    href: "/learn-mappping",
  },
  {
    label: "Resource Ownerships (IDOR)",
    icon: Link2,
    href: "/resource-user-mappings",
  },
  {
    label: "Findings",
    icon: Bug,
    href: "/findings",
  },
  {
    label: "AI Checker",
    icon: ScanSearch,
    href: "/ai-checker",
  },
  {
    label: "Agents",
    icon: Bot,
    href: "/agents",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export default function AuthLayout() {
  const data = useLoaderData<typeof loader>();
  return (
    <SidebarProvider>
      <AppSidebar
        organization={data.organizationName ?? ""}
        sidebarItems={sidebarItems}
        currentUserEmail={data.currentUserEmail}
      />
      <main className="flex flex-col flex-1 min-w-0">
        <TopBar
          sidebarItems={sidebarItems}
          endpointMappingsCount={data.endpointMappingsCount}
        />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
