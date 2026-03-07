import { useState, useCallback } from "react";
import { data, useLoaderData } from "react-router";
import {
    getEndpointRoleMappingsService,
    getDistinctRoles,
} from "~/.server/services/endpoint.role.mappings.service";
import { addEndpointRoleMapping, removeEndpointRoleMapping } from "~/.server/services/endpoint.role.mappings.service";
import DetailNodeSheet, {
    type GraphNode,
    type AuthorizationGraphData,
} from "~/components/detail.node.sheet";
import { ClientForceGraph } from "~/components/client-force-graph";
import type { Route } from "../+types/layout";

function buildGraphData(
    mappings: { normalizedPath: string; allowedRole: string }[]
): AuthorizationGraphData {
    const endpointIds = new Set(mappings.map((m) => m.normalizedPath));
    const roleIds = new Set(mappings.map((m) => m.allowedRole));
    const nodeIds = new Set([...endpointIds, ...roleIds]);
    const links = mappings.map((m) => ({
        source: m.normalizedPath,
        target: m.allowedRole,
    }));

    const nodes: GraphNode[] = Array.from(nodeIds).map((id) => ({
        id,
        type: endpointIds.has(id) ? "endpoint" : "role",
    }));

    return { nodes, links };
}

export async function loader() {
    const [mappings, distinctRoles] = await Promise.all([
        getEndpointRoleMappingsService(),
        getDistinctRoles(),
    ]);

    const graphData = buildGraphData(
        mappings.map((m) => ({
            normalizedPath: m.normalizedPath,
            allowedRole: m.allowedRole,
        }))
    );

    return data(
        {
            graphData,
            distinctRoles,
        },
        { status: 200 }
    );
}

export async function action({ request }: Route.ActionArgs) {
    const formData = await request.formData();
    const intent = formData.get("intent") as string | null;
    const normalizedPath = formData.get("normalizedPath") as string | null;
    const allowedRole = formData.get("allowedRole") as string | null;

    if (!normalizedPath || !allowedRole) {
        return data({ success: false, error: "Missing normalizedPath or allowedRole" }, { status: 400 });
    }

    if (intent === "add-role") {
        try {
            await addEndpointRoleMapping(normalizedPath, allowedRole);
            return data({ success: true }, { status: 200 });
        } catch (e) {
            return data(
                { success: false, error: e instanceof Error ? e.message : "Failed to add role" },
                { status: 500 }
            );
        }
    }

    if (intent === "remove-role") {
        try {
            await removeEndpointRoleMapping(normalizedPath, allowedRole);
            return data({ success: true }, { status: 200 });
        } catch (e) {
            return data(
                { success: false, error: e instanceof Error ? e.message : "Failed to remove role" },
                { status: 500 }
            );
        }
    }

    return data({ success: false, error: "Unknown intent" }, { status: 400 });
}

export default function AuthorizationGraphExplorerPage() {
    const { graphData, distinctRoles } = useLoaderData<typeof loader>();
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

    const handleNodeClick = useCallback((node: { id?: string; type?: string }, _event: MouseEvent) => {
        if (node.id && (node.type === "endpoint" || node.type === "role")) {
            setSelectedNode({
                id: node.id,
                type: node.type as "endpoint" | "role",
            });
        }
    }, []);

    return (
        <div className="flex flex-1 h-full min-h-0 p-4">
            <div className="flex-1 min-w-0 rounded-md border border-primary overflow-hidden bg-primary-foreground">
                <ClientForceGraph
                    graphData={graphData}
                    onNodeClick={handleNodeClick}
                />
            </div>
            <DetailNodeSheet
                selectedNode={selectedNode}
                onClose={() => setSelectedNode(null)}
                graphData={graphData}
                distinctRoles={distinctRoles}
            />
        </div>
    );
}
