import { Shield, ChevronsUpDown, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./ui/sidebar";
import { cn } from "~/lib/utils";
import { Link, useFetcher, useLocation } from "react-router";
import type { SidebarItem } from "~/routes/layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

/** Best-effort label from login email when no separate profile name exists in DB. */
function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim();
  if (!local) return email;
  const parts = local.split(/[._+-]+/).filter(Boolean);
  if (parts.length === 0) return email;
  return parts
    .map(
      (p) =>
        p.charAt(0).toUpperCase() + p.slice(1).toLowerCase(),
    )
    .join(" ");
}

function NavUser({ email }: { email: string }) {
  const { isMobile } = useSidebar();
  const fetcher = useFetcher();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              title={email}
              className="hover:bg-active-primary-foreground hover:text-slate-100 data-[state=open]:bg-active-primary-foreground data-[state=open]:text-white"
            >
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {displayNameFromEmail(email)}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg bg-primary-foreground text-white border-2 border-primary"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem
              className="cursor-pointer hover:bg-active-primary-foreground hover:text-white"
              onClick={() =>
                fetcher.submit(null, {
                  method: "POST",
                  action: "/auth/logout",
                })
              }
            >
              <LogOut stroke="red" />
              <span className="text-red-500">Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function AppSidebar({
  organization,
  sidebarItems,
  currentUserEmail,
}: {
  organization: string;
  sidebarItems: SidebarItem[];
  currentUserEmail: string;
}) {
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
            <SidebarGroupLabel className="text-gray-300">
              Analytics
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {sidebarItems.map((item) => (
                <SidebarMenuItem
                  key={item.href}
                  className="w-full hover:bg-active-primary-foreground hover:rounded-md hover:text-white"
                >
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
        <SidebarFooter>
          {currentUserEmail ? <NavUser email={currentUserEmail} /> : null}
        </SidebarFooter>
      </div>
    </Sidebar>
  );
}
