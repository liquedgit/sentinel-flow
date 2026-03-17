import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import MarkdownText from "./markdown-text";
import type { AICheckerRequestWithViolation } from "~/.server/services/ai-checker-request.service";

function formatDate(value: string | Date | null | undefined): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return value.toISOString();
}

export default function DetailAICheckerSheet({
  selected,
  setSelected,
}: {
  selected: AICheckerRequestWithViolation | null;
  setSelected: (selected: AICheckerRequestWithViolation | null) => void;
}) {
  return (
    <Sheet
      open={selected !== null}
      onOpenChange={(open) => {
        if (!open) setSelected(null);
      }}
    >
      <SheetContent
        className="bg-primary-foreground border-primary flex flex-col h-full"
        showCloseButton={false}
        side="right"
      >
        <div className="flex-shrink-0 border-b border-primary">
          <SheetHeader>
            <SheetTitle className="text-white">AI Checker Request</SheetTitle>
            <SheetDescription>
              <div className="font-bold text-gray-300">
                Request {selected?.id?.slice(0, 8)}…
              </div>
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="text-white space-y-4 p-4">
            {/* Request details */}
            <div className="bg-primary p-4 border border-primary space-y-3 text-light-gray rounded-md">
              <div className="text-sm font-medium">Request</div>
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <Label className="text-gray-400">ID</Label>
                  <p className="break-all">{selected?.id ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Status</Label>
                  <p>
                    <Badge
                      variant={
                        selected?.status === "complete"
                          ? "default"
                          : selected?.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {selected?.status ?? "—"}
                    </Badge>
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Is Violation</Label>
                  <p>
                    {selected?.isViolation == null
                      ? "—"
                      : selected.isViolation
                        ? "Yes"
                        : "No"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Created At</Label>
                  <p>{formatDate(selected?.createdAt)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Short Description</Label>
                  <p className="text-gray-200">
                    {selected?.shortDescription ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Description</Label>
                  <MarkdownText content={selected?.description} />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Impact</Label>
                  <MarkdownText content={selected?.impact} />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Recommendation Fix</Label>
                  <MarkdownText content={selected?.recommendationFix} />
                </div>
              </div>
            </div>

            {/* Related violation */}
            <div className="bg-primary p-4 border border-primary space-y-3 text-light-gray rounded-md">
              <div className="text-sm font-medium">Related Violation</div>
              <div className="space-y-2 text-sm">
                <div className="space-y-1">
                  <Label className="text-gray-400">Finding Path</Label>
                  <p className="break-all">
                    {selected?.violation?.normalizedPath ?? "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">User ID</Label>
                  <p>{selected?.violation?.userId ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Role</Label>
                  <p>{selected?.violation?.role ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Violation Timestamp</Label>
                  <p>{formatDate(selected?.violation?.timestamp)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Violation Status</Label>
                  <p>{selected?.violation?.status ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Violation ID</Label>
                  <p>{selected?.violation?.id ?? "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
