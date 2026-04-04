import { useState } from "react";
import { data, useLoaderData, useFetcher } from "react-router";
import { getViolationsWithAIChecker } from "~/.server/services/violation.service";
import { createAICheckerRequest } from "~/.server/services/ai-checker-request.service";
import DetailFindingsSheet from "~/components/detail.findings.sheet";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";
import {
  getViolationCategory,
  type ViolationCategory,
} from "~/lib/violation";
import type { ViolationForSheet } from "~/components/detail.findings.sheet";

function violationCategoryBadgeClass(category: ViolationCategory) {
  switch (category) {
    case "IDOR":
      return "border-amber-500/50 bg-amber-500/15 text-amber-100";
    case "RBAC":
      return "border-sky-500/50 bg-sky-500/15 text-sky-100";
    default:
      return "border-white/25 bg-white/5 text-gray-300";
  }
}

function findingStatusBadgeClass(status: string) {
  const s = status.toLowerCase();
  switch (s) {
    case "new":
      return "border-amber-400/50 bg-amber-400/10 text-amber-100";
    case "resolved":
    case "acknowledged":
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-100";
    case "false_positive":
    case "ignored":
      return "border-white/20 bg-white/5 text-gray-300";
    default:
      return "border-violet-400/40 bg-violet-500/10 text-violet-100";
  }
}

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }
  const formData = await request.formData();
  const violationId = formData.get("violationId");
  if (violationId === null || violationId === "") {
    return data(
      { success: false, error: "violationId is required" },
      { status: 400 }
    );
  }
  const id = parseInt(String(violationId), 10);
  if (Number.isNaN(id)) {
    return data(
      { success: false, error: "violationId must be a number" },
      { status: 400 }
    );
  }
  try {
    await createAICheckerRequest(id);
    return data({ success: true }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to create AI checker request";
    return data({ success: false, error: message }, { status: 500 });
  }
}

export async function loader() {
  const violations = await getViolationsWithAIChecker();
  return data(violations, { status: 200 });
}

export default function FindingsPage() {
  const violations = useLoaderData<typeof loader>();
  const [selected, setSelected] = useState<ViolationForSheet | null>(null);
  const fetcher = useFetcher<typeof action>();

  const currentRequest =
    selected && "aiCheckerRequests" in selected
      ? selected.aiCheckerRequests?.[0] ?? null
      : null;
  const canRequestDeepAnalysis =
    currentRequest == null || currentRequest.status === "failed";

  const handleRequestDeepAnalysis = (violation: ViolationForSheet) => {
    fetcher.submit(
      { violationId: String(violation.id) },
      { method: "POST", action: "/findings" }
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex">
        <div>
          <Input
            type="text"
            placeholder="Search findings"
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-primary">
        <Table className="bg-primary-foreground text-white">
          <TableHeader>
            <TableRow className="hover:bg-active-primary-foreground">
              <TableHead>ID</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Violation type</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resolved By</TableHead>
              <TableHead>Resolved At</TableHead>
              <TableHead>Created At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {violations.map((violation) => (
              <TableRow
                key={violation.id}
                className="hover:bg-active-primary-foreground cursor-pointer"
                onClick={() => {
                  setSelected(violation);
                }}
              >
                <TableCell>{violation.id}</TableCell>
                <TableCell>{violation.normalizedPath}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium",
                      violationCategoryBadgeClass(
                        getViolationCategory(violation.violationType)
                      )
                    )}
                  >
                    {getViolationCategory(violation.violationType)}
                  </Badge>
                </TableCell>
                <TableCell>{violation.userId}</TableCell>
                <TableCell>
                  {violation.role ? (
                    <Badge
                      variant="outline"
                      className="border-white/25 bg-white/5 text-gray-100 font-normal"
                    >
                      {violation.role}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-medium capitalize",
                      findingStatusBadgeClass(violation.status)
                    )}
                  >
                    {violation.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell>{violation.resolvedById}</TableCell>
                <TableCell>{violation.resolvedAt?.toISOString()}</TableCell>
                <TableCell>{violation.createdAt.toISOString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailFindingsSheet
        selected={selected}
        setSelected={setSelected}
        aiCheckerRequest={currentRequest}
        canRequestDeepAnalysis={canRequestDeepAnalysis}
        onRequestDeepAnalysis={handleRequestDeepAnalysis}
        isRequestingDeepAnalysis={fetcher.state === "submitting"}
        deepAnalysisError={
          fetcher.data &&
          typeof fetcher.data === "object" &&
          "success" in fetcher.data &&
          !(fetcher.data as { success: boolean }).success
            ? (fetcher.data as { error?: string }).error ?? null
            : null
        }
      />
    </div>
  );
}
