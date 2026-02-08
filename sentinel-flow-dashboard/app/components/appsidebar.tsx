import {
  LayoutDashboard,
  Shield,
  type LucideIcon,
  Network,
  Bug,
  Settings,
  Bot,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import { cn } from "~/lib/utils";
import { Link, useLocation } from "react-router";

interface SidebarItem {
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

export function AppSidebar({ organization }: { organization: string }) {
  const { state } = useSidebar();
  const pathname = useLocation().pathname;

  const isActive = (href: string) => pathname === href;

  return (
    <Sidebar
      collapsible="icon"
      className={cn(
        "relative h-full overflow-hidden app-sidebar",
        "bg-secondary",
        "text-white",
        "border-primary",
      )}
    >
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <SidebarHeader className="flex">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center",
                state == "expanded" ? "w-12 h-12" : "w-12 h-8",
              )}
            >
              <Shield
                className={cn(
                  "w-4 h-4 text-blue-500",
                  state == "expanded" ? "w-6 h-6" : "w-4 h-4",
                )}
              />
            </div>
            {state == "expanded" && (
              <div>
                <h3 className="font-medium">Sentinel Flow</h3>

                <p className="text-xs">{organization}</p>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent className="text-gray-300">
          <SidebarGroup>
            <SidebarGroupLabel>Analytics</SidebarGroupLabel>
            <SidebarGroupContent>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.href} className="w-full">
                  <Link
                    to={item.href}
                    className={cn(
                      "flex gap-4 p-2",
                      isActive(item.href) &&
                        "bg-primary-hover text-white font-medium rounded-md",
                    )}
                  >
                    {state == "collapsed" && (
                      <item.icon className={cn("w-12 h-4")} key={item.label} />
                    )}
                    {state == "expanded" && (
                      <div className="flex items-center gap-4">
                        <item.icon className="w-4 h-4" key={item.label} />
                        <p className="text-sm">{item.label}</p>
                      </div>
                    )}
                  </Link>
                </SidebarMenuItem>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
