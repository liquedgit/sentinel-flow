import { useMemo, useState } from "react";
import { data, useLoaderData } from "react-router";
import { getUserResourceMappingsService } from "~/.server/services/user.resource.mappings.service";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { formatDisplayDateTime } from "~/lib/format-date";

export async function loader() {
  const mappings = await getUserResourceMappingsService();
  return data({ mappings }, { status: 200 });
}

export default function ResourceUserMappingsPage() {
  const { mappings } = useLoaderData<typeof loader>();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mappings;
    return mappings.filter(
      (m) =>
        m.normalizedPath.toLowerCase().includes(q) ||
        m.resourceId.toLowerCase().includes(q) ||
        m.ownerUserId.toLowerCase().includes(q),
    );
  }, [mappings, query]);

  return (
    <div className="p-4 space-y-4">
      <div className="max-w-md">
        <Input
          type="search"
          placeholder="Filter by path, resource ID, or owner user ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-primary-foreground text-white border-primary selection:bg-active-primary/50 selection:text-white"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {filtered.length} mapping{filtered.length === 1 ? "" : "s"}
        {query.trim() ? ` (of ${mappings.length} loaded)` : ""}
        . Learned ownership used for IDOR detection: each row ties a resource
        instance to the user who accessed it legitimately.
      </p>
      <div className="rounded-md border border-primary overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-primary hover:bg-transparent">
              <TableHead className="text-gray-300">Path</TableHead>
              <TableHead className="text-gray-300">Resource ID</TableHead>
              <TableHead className="text-gray-300">Owner user ID</TableHead>
              <TableHead className="text-gray-300">First access</TableHead>
              <TableHead className="text-gray-300">Last access</TableHead>
              <TableHead className="text-gray-300 text-right">Accesses</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No mappings match your filter.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id} className="border-primary">
                  <TableCell className="font-mono text-xs max-w-[240px] truncate">
                    {m.normalizedPath}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.resourceId}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {m.ownerUserId}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDisplayDateTime(m.firstAccessTime)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDisplayDateTime(m.lastAccessTime)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.accessCount}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
