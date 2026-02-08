import { useLocation } from "react-router";
import { SidebarTrigger } from "./ui/sidebar";
import type { SidebarItem } from "~/routes/dashboard/layout";
import { useEffect, useMemo, useState } from "react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "./ui/breadcrumb";
import { Bell } from "lucide-react";

export default function TopBar({
  sidebarItems,
}: {
  sidebarItems: SidebarItem[];
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
