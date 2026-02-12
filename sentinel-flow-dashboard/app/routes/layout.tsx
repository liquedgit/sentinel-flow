import { Outlet, data, useLoaderData } from "react-router";
import type { Route } from "./dashboard/+types/dashboard.page";
import { SidebarProvider, SidebarTrigger } from "~/components/ui/sidebar";
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
} from "lucide-react";
import { Sheet } from "~/components/ui/sheet";

export const middleware: Route.MiddlewareFunction[] = [authMiddleware];

export async function loader() {
  const organization = await getOrganizationService();
  return data(organization?.organizationName, { status: 200 });
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
    label: "Findings",
    icon: Bug,
    href: "/findings",
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
  const organization = useLoaderData<typeof loader>();
  return (
    <SidebarProvider>
      <AppSidebar
        organization={organization ?? ""}
        sidebarItems={sidebarItems}
      />
      <main className="flex flex-col flex-1 min-w-0">
        <TopBar sidebarItems={sidebarItems} />
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
