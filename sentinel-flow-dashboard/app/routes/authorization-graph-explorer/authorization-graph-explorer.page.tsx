import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { data, useLoaderData } from "react-router";
import { getEndpointRoleMappingsService } from "~/.server/services/endpoint.role.mappings.service";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";

const ForceGraph2D = lazy(() =>
  import("react-force-graph-2d").then((mod) => ({ default: mod.default }))
);

export interface GraphNode {
  id: string;
  name: string;
  type: "endpoint" | "role";
}

export interface GraphLink {
  source: string;
  target: string;
}

export interface AuthorizationGraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

function transformToGraphData(
  mappings: Awaited<ReturnType<typeof getEndpointRoleMappingsService>>
): AuthorizationGraphData {
  const nodeIds = new Set<string>();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  for (const m of mappings) {
    const endpointId = `endpoint:${m.normalizedPath}`;
    const roleId = `role:${m.allowedRole}`;

    if (!nodeIds.has(endpointId)) {
      nodeIds.add(endpointId);
      nodes.push({
        id: endpointId,
        name: m.normalizedPath,
        type: "endpoint",
      });
    }
    if (!nodeIds.has(roleId)) {
      nodeIds.add(roleId);
      nodes.push({
        id: roleId,
        name: m.allowedRole,
        type: "role",
      });
    }
    links.push({ source: endpointId, target: roleId });
  }

  return { nodes, links };
}

export async function loader() {
  const mappings = await getEndpointRoleMappingsService();
  const graphData = transformToGraphData(mappings);
  return data(graphData, { status: 200 });
}

function AuthorizationGraph({ graphData }: { graphData: AuthorizationGraphData }) {
  const [mounted, setMounted] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    const el = containerRef.current;
    const updateSize = () => {
      if (el) {
        setDimensions({ width: el.clientWidth, height: el.clientHeight });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  if (!mounted) {
    return (
      <Skeleton className="h-[500px] w-full rounded-md bg-primary-foreground/50" />
    );
  }

  return (
    <div ref={containerRef} className="w-full h-[500px]">
      <ForceGraph2D
        graphData={graphData}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel="name"
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const label = (node as GraphNode).name;
          const fontSize = 12 / (globalScale);
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.fillText(label, node.x!, node.y!);
        }}
        nodeColor={(node) =>
          (node as GraphNode).type === "endpoint" ? "#137fec" : "#10b981"
        }
        linkColor={() => "#525252"}
        backgroundColor="transparent"
      />
    </div>
  );
}

export default function AuthorizationGraphExplorerPage() {
  const graphData = useLoaderData<typeof loader>();

  if (graphData.nodes.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <Card className="bg-primary-foreground border-primary">
          <CardHeader>
            <CardTitle className="text-white">
              Authorization Graph Explorer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              No endpoint-role mappings yet. Mappings will appear here once they
              are learned from your application logs.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <Card className="bg-primary-foreground border-primary overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">
            Authorization Graph Explorer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-primary overflow-hidden">
            <Suspense
              fallback={
                <Skeleton className="h-[500px] w-full bg-primary-foreground/50" />
              }
            >
              <AuthorizationGraph graphData={graphData} />
            </Suspense>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
