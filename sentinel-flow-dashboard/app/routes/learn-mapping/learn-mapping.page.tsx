import { useUploadFiles } from "@better-upload/client";
import { FileUp, GraduationCap } from "lucide-react";
import { produceScanRequest } from "~/.server/libs/kafka";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { UploadDropzone } from "~/components/ui/upload-dropzone";
import { data, Link, useFetcher } from "react-router";
import { randomUUID } from "node:crypto";
import { getLearningScanSettings } from "~/.server/services/learning.scan.settings.service";
import { toScanRequestPayload } from "~/lib/learning-scan-settings";

export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const requestId = randomUUID();
  try {
    const learningSettings = await getLearningScanSettings();
    await produceScanRequest({
      request_id: requestId,
      ...toScanRequestPayload(learningSettings),
    });
    return data({ success: true as const, requestId, mode: "scan" as const });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to queue learning scan";
    return data({ success: false as const, error: message }, { status: 500 });
  }
}

export default function LearnMappingPage() {
  const { control } = useUploadFiles({
    route: "images",
  });

  const scanFetcher = useFetcher<typeof action>();

  return (
    <div className="p-4">
      <div className="flex flex-col gap-8">
        <div className="space-y-4 w-full">
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
        <div className="w-full space-y-4">
          <div className="flex gap-2">
            <GraduationCap className="w-10 h-10 text-active-primary" />
            <Label className="font-bold text-md">Learning</Label>
          </div>
          <div className="w-full bg-secondary p-4 rounded-md border border-primary space-y-4">
            <scanFetcher.Form method="post">
              <Button
                type="submit"
                disabled={scanFetcher.state !== "idle"}
                className="bg-active-primary text-white hover:bg-active-primary/50 cursor-pointer disabled:opacity-60"
              >
                {scanFetcher.state !== "idle"
                  ? "Queueing…"
                  : "Run Learning Process"}
              </Button>
            </scanFetcher.Form>
            <p className="text-xs text-gray-400">
              Parameters come from{" "}
              <Link
                to="/settings"
                className="text-active-primary underline-offset-2 hover:underline"
              >
                Settings
              </Link>
              .
            </p>
            {scanFetcher.data && "success" in scanFetcher.data && (
              <p
                className={
                  scanFetcher.data.success
                    ? "text-sm text-muted-foreground"
                    : "text-sm text-destructive"
                }
              >
                {scanFetcher.data.success
                  ? "Learning scan queued. The detection engine will process it shortly."
                  : scanFetcher.data.error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
