import { useState } from "react";
import { data, useLoaderData } from "react-router";
import { getAICheckerRequests } from "~/.server/services/ai-checker-request.service";
import type { AICheckerRequestWithViolation } from "~/.server/services/ai-checker-request.service";
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
import DetailAICheckerSheet from "~/components/detail.ai-checker.sheet";

export async function loader() {
  const requests = await getAICheckerRequests();
  return data(requests, { status: 200 });
}

function truncate(str: string | null | undefined, max: number): string {
  if (str == null) return "—";
  return str.length <= max ? str : `${str.slice(0, max)}…`;
}

export default function AICheckerPage() {
  const requests = useLoaderData<typeof loader>();
  const [selected, setSelected] =
    useState<AICheckerRequestWithViolation | null>(null);

  return (
    <div className="p-4 space-y-4">
      <div className="flex">
        <div>
          <Input
            type="text"
            placeholder="Search AI checker requests"
            className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-primary">
        <Table className="bg-primary-foreground text-white">
          <TableHeader>
            <TableRow className="hover:bg-active-primary-foreground">
              <TableHead>Finding Path</TableHead>
              <TableHead>Users</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Is Violation</TableHead>
              <TableHead>Short Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((row) => (
              <TableRow
                key={row.id}
                className="hover:bg-active-primary-foreground cursor-pointer"
                onClick={() => setSelected(row)}
              >
                <TableCell>{row.violation.normalizedPath}</TableCell>
                <TableCell>{row.violation.userId ?? "—"}</TableCell>
                <TableCell>{row.violation.role ?? "—"}</TableCell>
                <TableCell>
                  {row.isViolation == null ? (
                    "—"
                  ) : row.isViolation ? (
                    <Badge variant="destructive">Yes</Badge>
                  ) : (
                    <Badge variant="secondary">No</Badge>
                  )}
                </TableCell>
                <TableCell>{truncate(row.shortDescription, 80)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailAICheckerSheet selected={selected} setSelected={setSelected} />
    </div>
  );
}
