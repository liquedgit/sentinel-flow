import {
  data,
  Link,
  redirect,
  useLoaderData,
  useSearchParams,
} from "react-router";
import type { Route } from "./+types/request-logs.page";
import { getRequestLogsPaginated } from "~/.server/services/request.log.service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import RequestMethod from "~/components/requestmethod";
import StatusCode from "~/components/statuscode";
import InlineCode from "~/components/inlinecode";
import { Button } from "~/components/ui/button";
import { formatDisplayDateTime } from "~/lib/format-date";

const PAGE_SIZES = [10, 25, 50, 100] as const;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = parsePositiveInt(url.searchParams.get("page"), 1);
  const pageSize = parsePositiveInt(url.searchParams.get("pageSize"), 25);

  const result = await getRequestLogsPaginated(page, pageSize);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  if (page !== result.page || pageSize !== result.pageSize) {
    const next = new URL(request.url);
    next.searchParams.set("page", String(result.page));
    next.searchParams.set("pageSize", String(result.pageSize));
    return redirect(next.pathname + next.search);
  }

  return data(
    {
      ...result,
      totalPages,
    },
    { status: 200 },
  );
}

export default function RequestLogsPage() {
  const { rows, total, page, pageSize, totalPages } =
    useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const setPageSize = (nextSize: string) => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("page", "1");
        p.set("pageSize", nextSize);
        return p;
      },
      { replace: true },
    );
  };

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-300">
          {total === 0
            ? "No request logs yet."
            : `Showing ${from}–${to} of ${total} logs`}
        </p>
        <div className="flex items-center gap-2">
          <label
            htmlFor="request-logs-page-size"
            className="text-sm text-gray-300 whitespace-nowrap"
          >
            Rows per page
          </label>
          <select
            id="request-logs-page-size"
            value={String(pageSize)}
            onChange={(e) => setPageSize(e.target.value)}
            className="h-9 w-[100px] rounded-md border border-primary bg-primary-foreground px-2 text-sm text-white"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={String(s)}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-primary overflow-x-auto">
        <Table className="bg-primary-foreground text-white min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-active-primary-foreground">
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead className="w-[100px]">Time</TableHead>
              <TableHead className="w-[80px]">Method</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[140px]">Status</TableHead>
              <TableHead>Trace</TableHead>
              <TableHead>Client IP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-8"
                >
                  No rows on this page.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="hover:bg-active-primary-foreground align-top"
                >
                  <TableCell className="font-mono text-xs">{row.id}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDisplayDateTime(row.timestamp)}
                  </TableCell>
                  <TableCell>
                    <RequestMethod method={row.method} />
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <InlineCode className="break-all text-xs">
                      {row.normalizedPath ?? row.path}
                    </InlineCode>
                  </TableCell>
                  <TableCell className="text-xs max-w-[120px] break-all">
                    {row.userId ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.role ? <InlineCode>{row.role}</InlineCode> : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusCode status={row.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs max-w-[140px] break-all">
                    {row.traceId ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs">{row.clientIp ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {total > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={page <= 1}
            className="bg-primary-foreground text-white border-primary hover:bg-active-primary-foreground"
            asChild={page > 1}
          >
            {page > 1 ? (
              <Link
                to={`/request-logs?page=${page - 1}&pageSize=${pageSize}`}
                replace
              >
                Previous
              </Link>
            ) : (
              <span>Previous</span>
            )}
          </Button>
          <span className="text-sm text-gray-300 px-2">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            disabled={page >= totalPages}
            className="bg-primary-foreground text-white border-primary hover:bg-active-primary-foreground"
            asChild={page < totalPages}
          >
            {page < totalPages ? (
              <Link
                to={`/request-logs?page=${page + 1}&pageSize=${pageSize}`}
                replace
              >
                Next
              </Link>
            ) : (
              <span>Next</span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
