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

export type ViolationWithRequestLog = Prisma.ViolationGetPayload<{
  include: { requestLog: true };
}>;

export default function DetailFindingsSheet({
  selected,
  setSelected,
}: {
  selected: ViolationWithRequestLog | null;
  setSelected: (selected: ViolationWithRequestLog | null) => void;
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
        <div className="text-white py-2">
          <div className="bg-primary p-4 border border-primary space-y-3 text-light-gray">
            <div className="text-sm">Triggering Events</div>
            <div className="flex w-full">
              <div className="text-sm space-y-2 w-1/2">
                <div>
                  <Label>Timestamp</Label>
                  <span>{selected?.timestamp.toISOString()}</span>
                </div>
                <div>
                  <Label>Normalized Path</Label>
                  <span>
                    {selected?.requestLog?.method} {selected?.normalizedPath}
                  </span>
                </div>
                <div>
                  <Label>Trace ID</Label>
                  <span>{selected?.requestLog?.traceId}</span>
                </div>
              </div>
              <div className="text-sm space-y-2 w-1/2">
                <div>
                  <Label>Client IP</Label>
                  <span>{selected?.requestLog?.clientIp}</span>
                </div>
                <div>
                  <Label>Status</Label>
                  <span>{selected?.requestLog?.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button className="bg-active-primary text-white hover:bg-active-primary-foreground">
            Mark as True Positive
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
