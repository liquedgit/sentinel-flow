import { Link, data, useLocation } from "react-router";
import { SidebarTrigger } from "./ui/sidebar";
import type { SidebarItem } from "~/routes/layout";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "./ui/breadcrumb";
import { Bell } from "lucide-react";
import { Button } from "./ui/button";

export default function TopBar({
  sidebarItems,
  endpointMappingsCount,
}: {
  sidebarItems: SidebarItem[];
  endpointMappingsCount: number;
}) {
  const path = useLocation().pathname;
  const item = useMemo(() => {
    const item = sidebarItems.find((item) => item.href === path);
    return item;
  }, [path]);

  return (
    <div className="bg-secondary flex w-full items-center justify-between border-primary border-2 p-4 gap-4 text">
      <div className="flex items-center gap-4">
        <SidebarTrigger />
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink href={item?.href}>{item?.label}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
      </div>
      <div className="flex items-center gap-2">
        {endpointMappingsCount == 0 && (
          <Link to="/learn-mappping">
            <Button
              aria-label="Notifications"
              className="bg-active-primary text-white hover:bg-active-primary/50"
            >
              Learn mappings now
            </Button>
          </Link>
        )}
        <button
          type="button"
          className="rounded-full p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
