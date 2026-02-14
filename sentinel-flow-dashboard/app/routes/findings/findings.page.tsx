import { useState } from "react";
import { data, useLoaderData } from "react-router";
import { getViolations } from "~/.server/services/violation.service";
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
import type { ViolationWithRequestLog as ViolationWithRequestLogClientType } from "~/components/detail.findings.sheet";

export async function loader() {
  const violations = await getViolations();
  const violation_mock: ViolationWithRequestLogClientType = {
    id: 1,
    timestamp: new Date(),
    normalizedPath: "/api/v1/admin/user-management/users",
    userId: "test",
    role: "test",
    expectedRoles: [],
    status: "test",
    resolvedById: "test",
    resolvedAt: new Date(),
    createdAt: new Date(),
    requestLogId: BigInt(1),
    requestLog: {
      id: BigInt(1),
      timestamp: new Date(),
      normalizedPath: "/api/v1/admin/user-management/users",
      userId: "test",
      role: "test",
      status: 200,
      createdAt: new Date(),
      method: "GET",
      path: "/api/v1/admin/user-management/users",
      clientIp: "127.0.0.1",
      traceId: "1234567890",
    },
  };
  violations.push(violation_mock);
  return data(violations, { status: 200 });
}

export default function FindingsPage() {
  const violations = useLoaderData<typeof loader>();
  const [selected, setSelected] =
    useState<ViolationWithRequestLogClientType | null>(null);

  return (
    <div className="p-4 space-y-4">
      <div className="flex">
        <Input
          type="text"
          placeholder="Search findings"
          className="bg-primary-foreground text-white border-primary"
        />
      </div>

      <div className="overflow-hidden rounded-md border border-primary">
        <Table className="bg-primary-foreground text-white">
          <TableHeader>
            <TableRow className="hover:bg-active-primary-foreground">
              <TableHead>ID</TableHead>
              <TableHead>Path</TableHead>
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
                  console.log(violation);
                  setSelected(violation);
                }}
              >
                <TableCell>{violation.id}</TableCell>
                <TableCell>{violation.normalizedPath}</TableCell>
                <TableCell>{violation.userId}</TableCell>
                <TableCell>{violation.role}</TableCell>
                <TableCell>{violation.status}</TableCell>
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
        deepCodeAnalysisResponse={"Hallo"}
      />
    </div>
  );
}
