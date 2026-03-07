import { Outlet, data, useLoaderData } from "react-router";
import type { Route } from "./dashboard/+types/dashboard.page";
import { SidebarProvider } from "~/components/ui/sidebar";
import { AppSidebar } from "~/components/appsidebar";
import { getOrganizationService } from "~/.server/services/organization.service";
import { authMiddleware } from "~/.server/middlewares/auth.middleware";
import TopBar from "~/components/topbar";
import {
  LayoutDashboard,
  Network,
  type LucideIcon,
  Bug,
  Bot,
  Users,
  Settings,
  BookText,
  ScanSearch,
} from "lucide-react";
import { getEndpointRoleMappingsService } from "~/.server/services/endpoint.role.mappings.service";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader() {
  const [organization, endpointMappings] = await Promise.all([
    getOrganizationService(),
    getEndpointRoleMappingsService(), // some other server call
  ]);

  return data(
    {
      organizationName: organization?.organizationName,
      endpointMappingsCount: endpointMappings.length,
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
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/",
  },
  {
    label: "Authorization Graph Explorer",
    icon: Network,
    href: "/authorization-graph-explorer",
  },
  {
    label: "Learn mappings",
    icon: BookText,
    href: "/learn-mappping",
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
    label: "Users management",
    icon: Users,
    href: "/users-management",
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
