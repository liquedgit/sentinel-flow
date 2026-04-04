import { useEffect } from "react";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "./ui/sheet";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import RequestMethod from "./requestmethod";
import StatusCode from "./statuscode";
import InlineCode from "./inlinecode";
import { ScrollArea } from "./ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useFetcher, useRevalidator } from "react-router";
import type { RequestLog } from "@/generated/prisma/client";
import { ChevronDown, X, Loader2 } from "lucide-react";
import { formatDisplayDateTime } from "~/lib/format-date";

export type GraphNode = {
    id: string;
    type: "endpoint" | "role";
};

export type GraphLink = {
    source: string | GraphNode;
    target: string | GraphNode;
};

export type AuthorizationGraphData = {
    nodes: GraphNode[];
    links: GraphLink[];
};

type DetailNodeSheetProps = {
    selectedNode: GraphNode | null;
    onClose: () => void;
    graphData: AuthorizationGraphData;
    distinctRoles: string[];
};

function getCurrentRolesForEndpoint(
    graphData: AuthorizationGraphData,
    endpointId: string
): string[] {
    return graphData.links
        .filter((link) => {
            // react-force-graph-2d mutates links, converting source/target from strings to objects
            const sourceId = typeof link.source === "string"
                ? link.source
                : link.source.id;
            return sourceId === endpointId;
        })
        .map((link) => {
            // Handle both string and object target
            return typeof link.target === "string"
                ? link.target
                : link.target.id;
        });
}

export default function DetailNodeSheet({
    selectedNode,
    onClose,
    graphData,
    distinctRoles,
}: DetailNodeSheetProps) {
    const logsFetcher = useFetcher<{ logs: RequestLog[] }>();
    const actionFetcher = useFetcher();
    const revalidator = useRevalidator();

    useEffect(() => {
        if (!selectedNode) return;
        const type = selectedNode.type === "endpoint" ? "endpoint" : "role";
        const value = encodeURIComponent(selectedNode.id);
        logsFetcher.load(
            `/authorization-graph-explorer/request-logs?type=${type}&value=${value}`
        );
    }, [selectedNode?.id, selectedNode?.type]);

    useEffect(() => {
        if (actionFetcher.data && "success" in actionFetcher.data && actionFetcher.data.success) {
            revalidator.revalidate();
        }
    }, [actionFetcher.data]);

    const logs = logsFetcher.data?.logs ?? [];
    const isSavingRoles = actionFetcher.state === "submitting" || revalidator.state === "loading";
    const isEndpoint = selectedNode?.type === "endpoint";
    const currentRoles = isEndpoint && selectedNode
        ? getCurrentRolesForEndpoint(graphData, selectedNode.id)
        : [];
    const availableRoles = distinctRoles.filter((r) => !currentRoles.includes(r));

    const handleAddRole = (role: string) => {
        if (!selectedNode || selectedNode.type !== "endpoint") return;
        actionFetcher.submit(
            {
                intent: "add-role",
                normalizedPath: selectedNode.id,
                allowedRole: role,
            },
            { method: "POST" }
        );
    };

    const handleRemoveRole = (role: string) => {
        if (!selectedNode || selectedNode.type !== "endpoint") return;
        actionFetcher.submit(
            {
                intent: "remove-role",
                normalizedPath: selectedNode.id,
                allowedRole: role,
            },
            { method: "POST" }
        );
    };

    return (
        <Sheet
            open={selectedNode !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <SheetContent
                className="bg-primary-foreground border-primary flex flex-col h-full"
                showCloseButton={false}
                side="right"
            >
                <div className="flex-shrink-0 border-b border-primary">
                    <SheetHeader>
                        <SheetTitle className="text-white">
                            {isEndpoint
                                ? `Endpoint: ${selectedNode?.id ?? ""}`
                                : `Role: ${selectedNode?.id ?? ""}`}
                        </SheetTitle>
                        <SheetDescription>
                            <div className="font-bold text-muted-foreground">
                                {isEndpoint ? "Endpoint details" : "Role details"}
                            </div>
                        </SheetDescription>
                    </SheetHeader>
                </div>

                <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="text-white space-y-4 p-4">
                        {isEndpoint && selectedNode && (
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">
                                    Roles for this endpoint
                                </Label>
                                {isSavingRoles && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="size-4 animate-spin" />
                                        <span>Saving changes...</span>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    {currentRoles.map((role) => (
                                        <div
                                            key={role}
                                            className="inline-flex items-center gap-1 bg-primary px-2 py-1 rounded-md border border-primary"
                                        >
                                            <InlineCode>{role}</InlineCode>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleRemoveRole(role)}
                                                disabled={isSavingRoles}
                                            >
                                                <X className="size-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    {currentRoles.length === 0 && (
                                        <div className="text-sm text-muted-foreground">
                                            No roles assigned.
                                        </div>
                                    )}
                                </div>
                                {availableRoles.length > 0 && (
                                    <div className="pt-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1"
                                                    disabled={isSavingRoles}
                                                >
                                                    Add role
                                                    <ChevronDown className="size-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="bg-primary text-white">
                                                {availableRoles.map((role) => (
                                                    <DropdownMenuItem
                                                        key={role}
                                                        onSelect={() => handleAddRole(role)}
                                                    >
                                                        {role}
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                10 recent request logs
                            </Label>
                            {logsFetcher.state === "loading" && logs.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    Loading...
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="text-sm text-muted-foreground">
                                    No request logs found.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map((log) => (
                                        <div
                                            key={String(log.id)}
                                            className="bg-primary p-3 border border-primary rounded-md text-sm space-y-1"
                                        >
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <RequestMethod method={log.method} />
                                                <InlineCode>
                                                    {log.normalizedPath ?? log.path}
                                                </InlineCode>
                                                {log.role && (
                                                    <span className="text-muted-foreground">
                                                        role: <InlineCode>{log.role}</InlineCode>
                                                    </span>
                                                )}
                                                <StatusCode status={log.status} />
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatDisplayDateTime(
                                                    log.timestamp,
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
