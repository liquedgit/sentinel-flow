import type { Prisma, Violation } from "@/generated/prisma/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { Label } from "./ui/label";
import { Button } from "./ui/button";
import { Sparkles } from "lucide-react";
import RequestMethod from "./requestmethod";
import StatusCode from "./statuscode";

export type ViolationWithRequestLog = Prisma.ViolationGetPayload<{
  include: { requestLog: true };
}>;

export default function DetailFindingsSheet({
  selected,
  setSelected,
  deepCodeAnalysisResponse,
}: {
  selected: ViolationWithRequestLog | null;
  setSelected: (selected: ViolationWithRequestLog | null) => void;
  deepCodeAnalysisResponse: string | null;
}) {
  return (
    <Sheet
      open={selected !== null}
      onOpenChange={(open) => {
        if (!open) setSelected(null);
      }}
    >
      <SheetContent
        className="bg-primary-foreground  border-primary"
        showCloseButton={false}
        side="right"
      >
        <SheetHeader>
          <SheetTitle className="text-white">Investigation Details</SheetTitle>
          <SheetDescription>
            <div className="font-bold">Finding #{selected?.id}</div>
          </SheetDescription>
        </SheetHeader>
        <div className="text-white py-2 space-y-4">
          {/* Triggering Events */}
          <div className="bg-primary p-4 border border-primary space-y-3 text-light-gray">
            <div className="text-sm">Triggering Events</div>
            <div className="flex w-full">
              <div className="text-sm space-y-2 w-1/2">
                <div className="space-y-1">
                  <Label>Timestamp</Label>
                  <span>{selected?.timestamp.toISOString()}</span>
                </div>
                <div className="space-y-1">
                  <Label>Normalized Path</Label>
                  <div>
                    <RequestMethod method={selected?.requestLog?.method} />{" "}
                    {selected?.normalizedPath}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Trace ID</Label>
                  <span>{selected?.requestLog?.traceId}</span>
                </div>
              </div>
              <div className="text-sm space-y-2 w-1/2">
                <div className="space-y-1">
                  <Label>Client IP</Label>
                  <span>{selected?.requestLog?.clientIp}</span>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <StatusCode status={selected?.requestLog?.status} />
                </div>
              </div>
            </div>
          </div>
          {/* Deep Code Analysis Response */}
          <div className="p-4">
            <div className="bg-light-blue  border border-active-primary p-3 rounded-md">
              <div className="text-sm font-medium flex space-x-2 text-active-primary">
                <Sparkles className="size-4" />
                <div>Deep Code Analysis Response</div>
              </div>
              <div className="text-sm text-gray-200">
                {deepCodeAnalysisResponse}
              </div>
            </div>
          </div>
        </div>
        <SheetFooter className="border border-primary">
          <div className="space-y-3 text-sm">
            <div className="font-bold">Is this Relationship is Expected ?</div>
            <div className="flex gap-2">
              <Button variant={"destructive"}>Mark as Unexpected</Button>
              <Button className="bg-active-primary text-white hover:bg-light-blue border border-active-primary hover:border-light-blue">
                Mark as Expected
              </Button>
            </div>
            {deepCodeAnalysisResponse === null && (
              <div className="flex items-center justify-center w-full text-white">
                <Button className="border-active-primary border text-active-primary bg-primary-foreground hover:bg-light-blue">
                  <Sparkles className="size-4" />
                  Deep Code Analysis with AI
                </Button>
              </div>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
