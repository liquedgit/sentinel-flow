import type { Prisma } from "@/generated/prisma/client";
import type { ViolationWithRequestLogAndAIChecker } from "~/.server/services/violation.service";
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
import InlineCode from "./inlinecode";
import { ScrollArea } from "./ui/scroll-area";
import { ViolationType } from "~/lib/violation";

export type ViolationWithRequestLog = Prisma.ViolationGetPayload<{
  include: { requestLog: true };
}>;

export type ViolationForSheet = ViolationWithRequestLog | ViolationWithRequestLogAndAIChecker;

export type AICheckerRequestClient = {
  id: string;
  status: string;
  description?: string | null;
  shortDescription?: string | null;
  impact?: string | null;
  recommendationFix?: string | null;
  isViolation?: boolean | null;
};

export default function DetailFindingsSheet({
  selected,
  setSelected,
  deepCodeAnalysisResponse,
  aiCheckerRequest = null,
  canRequestDeepAnalysis = true,
  onRequestDeepAnalysis,
  isRequestingDeepAnalysis = false,
  deepAnalysisError = null,
}: {
  selected: ViolationForSheet | null;
  setSelected: (selected: ViolationForSheet | null) => void;
  deepCodeAnalysisResponse: string | null;
  aiCheckerRequest?: AICheckerRequestClient | null;
  canRequestDeepAnalysis?: boolean;
  onRequestDeepAnalysis?: (violation: ViolationForSheet) => void;
  isRequestingDeepAnalysis?: boolean;
  deepAnalysisError?: string | null;
}) {
  const getViolationType = (selected: ViolationWithRequestLog | null) => {
    // TODO: Validate Violation Type
    return ViolationType.VERTICAL_IDOR;
  };

  return (
    <Sheet
      open={selected !== null}
      onOpenChange={(open) => {
        if (!open) setSelected(null);
      }}
    >
      <SheetContent
        className="bg-primary-foreground border-primary  flex flex-col h-full"
        showCloseButton={false}
        side="right"
      >
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 border-b border-primary">
          <SheetHeader>
            <SheetTitle className="text-white">
              Investigation Details
            </SheetTitle>
            <SheetDescription>
              <div className="font-bold">Finding #{selected?.id}</div>
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Scrollable Content */}
        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="text-white space-y-4">
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

            {aiCheckerRequest?.status === "running" && (
              <div className="px-4">
                <div className="bg-light-blue border border-active-primary p-3 rounded-md">
                  <div className="text-sm font-medium flex space-x-2 text-active-primary">
                    <Sparkles className="size-4" />
                    <div>Deep Code Analysis Response</div>
                  </div>
                  <div className="text-sm text-gray-200">
                    Analysis in progress...
                  </div>
                </div>
              </div>
            )}

            {(aiCheckerRequest?.status === "complete" ||
              deepCodeAnalysisResponse !== null) && (
              <div className="px-4">
                <div className="bg-light-blue border border-active-primary p-3 rounded-md">
                  <div className="text-sm font-medium flex space-x-2 text-active-primary">
                    <Sparkles className="size-4" />
                    <div>Deep Code Analysis Response</div>
                  </div>
                  <div className="text-sm text-gray-200 space-y-2">
                    {aiCheckerRequest?.status === "complete" ? (
                      <>
                        {aiCheckerRequest.description != null &&
                          aiCheckerRequest.description !== "" && (
                            <p>{aiCheckerRequest.description}</p>
                          )}
                        {aiCheckerRequest.shortDescription != null &&
                          aiCheckerRequest.shortDescription !== "" && (
                            <p>{aiCheckerRequest.shortDescription}</p>
                          )}
                      </>
                    ) : (
                      <p>{deepCodeAnalysisResponse}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 px-4">
              {/* Title */}
              <div className="font-medium text-sm">
                {getViolationType(selected) === ViolationType.VERTICAL_IDOR
                  ? "Role Based Access Control observed to be violated"
                  : "Unauthorized Access to Resource observed to be violated"}
              </div>

              {getViolationType(selected) === ViolationType.VERTICAL_IDOR && (
                <>
                  <div>
                    <h4 className="font-medium text-sm text-gray-400 mb-1">
                      What Happened:
                    </h4>
                    <p className="text-sm">
                      The request was made with role{" "}
                      <InlineCode children={selected?.role} /> which is not
                      authorized to access this resource. Expected roles: Admin,
                      Super Admin
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-400 mb-1">
                      Expected Behavior:
                    </h4>
                    <p className="text-sm">
                      This resource should only be accessible by users with
                      specific roles. Access from unauthorized roles indicates a
                      privilege escalation attempt.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-400 mb-1">
                      Affected Resource:
                    </h4>
                    <RequestMethod method={selected?.requestLog?.method} />{" "}
                    <InlineCode children={selected?.normalizedPath} />
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-400 mb-1">
                      {aiCheckerRequest?.status === "complete" &&
                      aiCheckerRequest.impact != null
                        ? "Impact:"
                        : "Security Risk:"}
                    </h4>
                    {aiCheckerRequest?.status === "complete" &&
                    aiCheckerRequest.impact != null &&
                    aiCheckerRequest.impact !== "" ? (
                      <div className="text-sm whitespace-pre-wrap">
                        {aiCheckerRequest.impact.split("\n").map((line, i) => (
                          <p key={i}>{line || " "}</p>
                        ))}
                      </div>
                    ) : (
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>Potential Vertical IDOR (Privilege Escalation)</li>
                        <li>Unauthorized role accessing privileged resources</li>
                        <li>Role-based access control (RBAC) bypass attempt</li>
                        <li>
                          Critical admin/privileged functions may be exposed
                        </li>
                      </ul>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-sm text-gray-400 mb-1">
                      Recommended Actions:
                    </h4>
                    {aiCheckerRequest?.status === "complete" &&
                    aiCheckerRequest.recommendationFix != null &&
                    aiCheckerRequest.recommendationFix !== "" ? (
                      <div className="text-sm whitespace-pre-wrap">
                        {aiCheckerRequest.recommendationFix
                          .split("\n")
                          .map((line, i) => (
                            <p key={i}>{line || " "}</p>
                          ))}
                      </div>
                    ) : (
                      <ul className="list-disc list-inside text-sm space-y-1">
                        <li>
                          Verify role assignment for user{" "}
                          <InlineCode children={selected?.userId} />
                        </li>
                        <li>Review RBAC implementation on this endpoint</li>
                        <li>Check if role permissions were recently modified</li>
                        <li>
                          Audit all endpoints accessed by this role in last 24h
                        </li>
                        <li>Consider implementing stricter role validation</li>
                      </ul>
                    )}
                  </div>
                </>
              )}

              {getViolationType(selected) === ViolationType.HORIZONTAL_IDOR && (
                <>
                  {/* HORIZONTAL IDOR  Description */}
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-sm text-gray-400 mb-1">
                        What Happened:
                      </h4>
                      <p className="text-sm">
                        The request was made with user ID{" "}
                        <InlineCode children={selected?.userId} /> which is
                        breaking the observed relationship between the user and
                        the resource.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-400 mb-1">
                        Expected Behavior:
                      </h4>
                      <p className="text-sm">
                        This resource should only have one relation to a
                        specific user (1:1 relationship).
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-400 mb-1">
                        Affected Resource:
                      </h4>
                      <RequestMethod method={selected?.requestLog?.method} />{" "}
                      <InlineCode children={selected?.normalizedPath} />
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-400 mb-1">
                        {aiCheckerRequest?.status === "complete" &&
                        aiCheckerRequest.impact != null
                          ? "Impact:"
                          : "Security Risk:"}
                      </h4>
                      {aiCheckerRequest?.status === "complete" &&
                      aiCheckerRequest.impact != null &&
                      aiCheckerRequest.impact !== "" ? (
                        <div className="text-sm whitespace-pre-wrap">
                          {aiCheckerRequest.impact
                            .split("\n")
                            .map((line, i) => (
                              <p key={i}>{line || " "}</p>
                            ))}
                        </div>
                      ) : (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>
                            Potential Horizontal IDOR (Insecure Direct Object
                            Reference)
                          </li>
                          <li>
                            Unauthorized user accessing another user's resource
                          </li>
                          <li>Possible privilege escalation attempt</li>
                        </ul>
                      )}
                    </div>

                    <div>
                      <h4 className="font-medium text-sm text-gray-400 mb-1">
                        Recommended Actions:
                      </h4>
                      {aiCheckerRequest?.status === "complete" &&
                      aiCheckerRequest.recommendationFix != null &&
                      aiCheckerRequest.recommendationFix !== "" ? (
                        <div className="text-sm whitespace-pre-wrap">
                          {aiCheckerRequest.recommendationFix
                            .split("\n")
                            .map((line, i) => (
                              <p key={i}>{line || " "}</p>
                            ))}
                        </div>
                      ) : (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          <li>
                            Verify if user{" "}
                            <InlineCode children={selected?.userId} /> has
                            legitimate access to this resource
                          </li>
                          <li>Check authorization logic on this endpoint</li>
                          <li>
                            Review recent access logs for suspicious activity
                          </li>
                          <li>
                            Consider implementing additional access controls
                          </li>
                        </ul>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 border-t border-primary">
          <SheetFooter>
            <div className="space-y-3 text-sm w-full">
              <div className="font-bold">
                Is this Relationship is Expected ?
              </div>
              <div className="flex gap-2">
                <Button variant={"destructive"} className="cursor-pointer">
                  Mark as Unexpected
                </Button>
                <Button className="bg-active-primary text-white hover:bg-light-blue border border-active-primary hover:border-light-blue cursor-pointer">
                  Mark as Expected
                </Button>
              </div>
              {deepCodeAnalysisResponse === null &&
                aiCheckerRequest?.status !== "complete" && (
                  <div className="flex flex-col items-center justify-center w-full text-white gap-2">
                    {deepAnalysisError && (
                      <div className="text-sm text-destructive">
                        {deepAnalysisError}
                      </div>
                    )}
                    <Button
                      className="border-active-primary border text-active-primary bg-primary-foreground hover:bg-light-blue"
                      disabled={
                        !selected ||
                        !onRequestDeepAnalysis ||
                        isRequestingDeepAnalysis ||
                        !canRequestDeepAnalysis
                      }
                      onClick={() =>
                        selected && onRequestDeepAnalysis?.(selected)
                      }
                      title={
                        !canRequestDeepAnalysis
                          ? "Analysis already in progress or completed"
                          : undefined
                      }
                    >
                      <Sparkles className="size-4" />
                      {isRequestingDeepAnalysis
                        ? "Requesting..."
                        : aiCheckerRequest?.status === "failed"
                          ? "Request again"
                          : "Deep Code Analysis with AI"}
                    </Button>
                  </div>
                )}
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
