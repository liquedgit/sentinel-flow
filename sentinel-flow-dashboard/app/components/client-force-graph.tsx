import { lazy, Suspense, useMemo } from "react";
import type { GraphNode, AuthorizationGraphData } from "./detail.node.sheet";

const ForceGraph2D = lazy(() => import("react-force-graph-2d"));

interface ClientForceGraphProps {
    graphData: AuthorizationGraphData;
    onNodeClick: (node: GraphNode, event: MouseEvent) => void;
}

export function ClientForceGraph({ graphData, onNodeClick }: ClientForceGraphProps) {
    const nodeCanvasObject = useMemo(
        () => (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = String(node.id);
            const fontSize = 12 / globalScale;

            // Measure text to fit it within the node
            ctx.font = `${fontSize}px Sans-Serif`;
            const textWidth = ctx.measureText(label).width;

            // Adjust node size based on text length
            const nodeRadius = Math.max(6, textWidth / 2 + 2);

            // Draw colored circle background
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.type === "endpoint" ? "#137fec" : "#10b981";
            ctx.fill();

            // Draw white text centered
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, node.x, node.y);
        },
        []
    );

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-full">Loading graph...</div>}>
            <ForceGraph2D
                graphData={{ nodes: graphData.nodes, links: graphData.links }}
                nodeId="id"
                linkColor={() => "#9c9a9a"}
                linkDirectionalArrowColor="#9c9a9a"
                nodeLabel={(node) => String((node as GraphNode).id)}
                nodeCanvasObject={nodeCanvasObject}
                onNodeClick={(node, event) => onNodeClick(node as GraphNode, event)}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
            />
        </Suspense>
    );
}
