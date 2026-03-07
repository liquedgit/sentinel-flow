import { useUploadFiles } from "@better-upload/client";
import { FileUp, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { getViolations } from "~/.server/services/violation.service";
import DetailFindingsSheet, {
  type ViolationWithRequestLog,
} from "~/components/detail.findings.sheet";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { UploadDropzone } from "~/components/ui/upload-dropzone";
import type { ViolationWithRequestLog as ViolationWithRequestLogClientType } from "~/components/detail.findings.sheet";
import { data, useLoaderData } from "react-router";

export async function loader() {
  const violations = await getViolations();
  return data(violations, { status: 200 });
}

export default function LearnMappingPage() {
  const { control } = useUploadFiles({
    route: "images",
  });

  const violations = useLoaderData<
    typeof loader
  >() as ViolationWithRequestLogClientType[];

  const [value, setValue] = useState([15]);
  const [selected, setSelected] = useState<ViolationWithRequestLog | null>(
    null,
  );

  return (
    <>
      <div className="p-4 space-y-8">
        <div className="flex gap-4">
          <div className="space-y-4 w-1/2 h-full">
            {/* Left Side */}
            <div className="flex gap-2">
              <FileUp fill="#137fec" className="w-10 h-10 text-primary" />
              <Label className="font-bold text-md">Log Ingestion</Label>
            </div>
            <div>
              <UploadDropzone
                control={control}
                accept="text/csv, application/json"
                description={"Drag and drop CSV or JSON files here"}
                title="Upload Access Logs"
              />
            </div>
          </div>
          <div className="w-1/2">
            {/* Right side */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <SlidersHorizontal className="w-10 h-10 text-active-primary" />
                <Label className="font-bold text-md">Log Ingestion</Label>
              </div>
              <div className="w-full h-full bg-secondary p-4 rounded-md border border-primary space-y-8">
                <div className="grid w-full max-w-xs gap-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="slider-demo-temperature">
                      Percentage of anomaly logs
                    </Label>
                    <span className="text-muted-foreground text-sm">
                      {value.join(", ")}%
                    </span>
                  </div>
                  <Slider
                    id="slider-demo-temperature"
                    value={value}
                    onValueChange={setValue}
                    min={1}
                    max={100}
                    step={1}
                  />
                </div>
                <div>
                  <Button className="bg-active-primary text-white hover:bg-active-primary/50 cursor-pointer">
                    Run Learning Proccess
                  </Button>
                </div>
              </div>
            </div>
          </div>
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
    </>
  );
}
