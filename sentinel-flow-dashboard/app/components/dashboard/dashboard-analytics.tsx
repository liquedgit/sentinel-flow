"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  AGENT_ONLINE_THRESHOLD_MINUTES,
  type RequestLogDailyCount,
} from "~/lib/dashboard";
import { cn } from "~/lib/utils";

export function RequestVolumeChart({ data }: { data: RequestLogDailyCount[] }) {
  const max = useMemo(
    () => Math.max(1, ...data.map((d) => d.count)),
    [data],
  );
  const [hover, setHover] = useState<RequestLogDailyCount | null>(null);

  return (
    <div className="space-y-3">
      <div className="relative rounded-lg border-2 border-primary bg-primary-foreground/70 px-2 pt-4 pb-2 shadow-inner">
        <div className="overflow-x-auto pb-2">
          <div
            className="flex h-52 min-w-[720px] items-end gap-1.5 px-1"
            role="img"
            aria-label="Request volume by day for the last 30 days"
          >
            {data.map((d, i) => {
              const hPct = (d.count / max) * 100;
              const showLabel = i % 5 === 0 || i === data.length - 1;
              return (
                <div
                  key={d.dateKey}
                  className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                >
                  <div className="relative flex h-44 w-full max-w-[20px] items-end justify-center sm:max-w-[24px]">
                    <div
                      className={cn(
                        "w-full min-h-0 rounded-t-md bg-active-primary transition-all duration-150",
                        "group-hover:brightness-110 group-focus-visible:ring-2 group-focus-visible:ring-active-primary/50",
                        d.count === 0 && "bg-active-secondary/35",
                      )}
                      style={{
                        height: d.count === 0 ? "4px" : `${Math.max(hPct, 6)}%`,
                      }}
                      title={`${d.dateKey}: ${d.count.toLocaleString()} requests`}
                    />
                  </div>
                  {showLabel ? (
                    <span className="max-w-full truncate text-center text-[10px] leading-none text-light-gray sm:text-xs">
                      {d.label}
                    </span>
                  ) : (
                    <span className="h-3 w-px opacity-0" aria-hidden />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {hover && (
          <div
            className="pointer-events-none absolute left-4 top-3 rounded-md border-2 border-primary bg-secondary px-3 py-2 text-sm shadow-lg"
            role="status"
          >
            <div className="font-medium text-white">{hover.dateKey}</div>
            <div className="text-light-gray">
              {hover.count.toLocaleString()} requests
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-light-gray">
        Bars show total ingested requests per calendar day (UTC). Hover a bar
        for the exact count.
      </p>
    </div>
  );
}

export function FindingsStatusPie({
  resolved,
  open,
}: {
  resolved: number;
  open: number;
}) {
  const total = resolved + open;
  const resolvedDeg = total === 0 ? 0 : (resolved / total) * 360;

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-10">
      <div className="relative h-44 w-44 shrink-0">
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-primary shadow-inner",
            total === 0 && "bg-primary-foreground/75",
          )}
          style={
            total === 0
              ? undefined
              : {
                  background: `conic-gradient(var(--chart-2) 0deg ${resolvedDeg}deg, var(--chart-5) ${resolvedDeg}deg 360deg)`,
                }
          }
          role="img"
          aria-label={
            total === 0
              ? "No findings yet"
              : `${resolved} resolved, ${open} open findings`
          }
        />
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-secondary text-center shadow-md ring-2 ring-primary">
          <span className="text-2xl font-semibold tracking-tight text-white">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-light-gray">total</span>
        </div>
      </div>
      <ul className="space-y-3 text-sm">
        <li className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-chart-2 ring-2 ring-primary/40"
            aria-hidden
          />
          <div>
            <div className="font-medium text-white">Resolved</div>
            <div className="text-light-gray">
              {resolved.toLocaleString()} closed items
            </div>
          </div>
        </li>
        <li className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full bg-chart-5 ring-2 ring-primary/40"
            aria-hidden
          />
          <div>
            <div className="font-medium text-white">Open</div>
            <div className="text-light-gray">
              {open.toLocaleString()} need review
            </div>
          </div>
        </li>
      </ul>
    </div>
  );
}

export function AgentCoverageStrip({
  total,
  active,
  inactive,
}: {
  total: number;
  active: number;
  inactive: number;
}) {
  const activePct = total === 0 ? 0 : Math.round((active / total) * 100);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatBlock
          label="Registered agents"
          value={total}
          hint="Connectors sending traffic to Sentinel Flow"
        />
        <StatBlock
          label="Sending data now"
          value={active}
          hint={`Heartbeat within the last ${AGENT_ONLINE_THRESHOLD_MINUTES} minutes`}
          accent="positive"
        />
        <StatBlock
          label="Not recently seen"
          value={inactive}
          hint="Offline or awaiting first heartbeat"
          accent={inactive > 0 ? "caution" : "neutral"}
        />
      </div>
      {total > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-light-gray">
            <span>Online share</span>
            <span>{activePct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-primary-foreground/80 ring-1 ring-primary/50">
            <div
              className="h-full rounded-full bg-active-primary transition-all duration-500"
              style={{ width: `${activePct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  hint,
  accent = "neutral",
}: {
  label: string;
  value: number;
  hint: string;
  accent?: "neutral" | "positive" | "caution";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 px-4 py-3",
        accent === "positive" &&
          "border-active-primary/55 bg-active-primary/10 shadow-sm",
        accent === "caution" &&
          "border-chart-5/50 bg-chart-5/10 shadow-sm",
        accent === "neutral" && "border-primary bg-primary-foreground/50",
      )}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-light-gray">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value.toLocaleString()}
      </div>
      <p className="mt-1 text-xs leading-snug text-light-gray">{hint}</p>
    </div>
  );
}

export function CoverageTiles({
  resourceMappings,
  rbacMappings,
}: {
  resourceMappings: number;
  rbacMappings: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border-2 border-primary bg-primary-foreground/80 p-6 shadow-sm transition-colors hover:border-active-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-light-gray">
              Resource ownership rows
            </h3>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white tabular-nums">
              {resourceMappings.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Learned links between users and sensitive resources (horizontal
              access context).
            </p>
          </div>
          <Link
            to="/resource-user-mappings"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-active-primary hover:bg-active-primary/15 hover:underline"
          >
            View
          </Link>
        </div>
      </div>
      <div className="rounded-xl border-2 border-primary bg-primary-foreground/80 p-6 shadow-sm transition-colors hover:border-active-primary/40">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-medium text-light-gray">
              RBAC access rules
            </h3>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-white tabular-nums">
              {rbacMappings.toLocaleString()}
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Endpoint–role pairs the system uses to spot role misuse (vertical
              context).
            </p>
          </div>
          <Link
            to="/authorization-graph-explorer"
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-active-primary hover:bg-active-primary/15 hover:underline"
          >
            View
          </Link>
        </div>
      </div>
    </div>
  );
}
