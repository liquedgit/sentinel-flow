import { data, useLoaderData, Link } from "react-router";
import { getDashboardMetrics } from "~/.server/services/dashboard.metrics.service";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import {
  AgentCoverageStrip,
  CoverageTiles,
  FindingsStatusPie,
  RequestVolumeChart,
} from "~/components/dashboard/dashboard-analytics";
import { ArrowRight, LayoutDashboard } from "lucide-react";

export async function loader() {
  const metrics = await getDashboardMetrics();
  return data({ metrics }, { status: 200 });
}

export default function DashboardPage() {
  const { metrics } = useLoaderData<typeof loader>();

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 text-gray-200">
      <header className="flex flex-col gap-3 border-b-2 border-primary pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-active-primary/40 bg-active-primary/15 text-active-primary shadow-sm">
            <LayoutDashboard className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Analytics overview
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-light-gray">
              High-level signal for leaders and operators: traffic observed,
              policy coverage, findings pipeline, and agent health.
            </p>
          </div>
        </div>
        <Button
          asChild
          variant="outline"
          className="shrink-0 border-2 border-primary bg-primary-foreground text-white hover:bg-accent hover:text-white"
        >
          <Link to="/findings">
            Review findings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </header>

      <CoverageTiles
        resourceMappings={metrics.userResourceMappingCount}
        rbacMappings={metrics.rbacMappingCount}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-2 border-primary bg-secondary text-gray-200 shadow-none lg:col-span-3">
          <CardHeader className="border-b border-primary pb-4">
            <CardTitle className="text-lg text-white">
              Request activity
            </CardTitle>
            <CardDescription className="text-light-gray">
              Daily volume of API requests captured from your environment over
              the last 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <RequestVolumeChart data={metrics.requestLogsByDay} />
          </CardContent>
          <CardFooter className="border-t border-primary pt-4">
            <Link
              to="/request-logs"
              className="text-sm font-medium text-active-primary hover:text-active-primary/90 hover:underline"
            >
              Open request logs
            </Link>
          </CardFooter>
        </Card>

        <Card className="border-2 border-primary bg-secondary text-gray-200 shadow-none lg:col-span-2">
          <CardHeader className="border-b border-primary pb-4">
            <CardTitle className="text-lg text-white">
              Findings status
            </CardTitle>
            <CardDescription className="text-light-gray">
              Resolved includes acknowledged closures; open items still need
              triage.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <FindingsStatusPie
              resolved={metrics.findingsResolved}
              open={metrics.findingsOpen}
            />
          </CardContent>
          <CardFooter className="border-t border-primary pt-4">
            <Link
              to="/findings"
              className="text-sm font-medium text-active-primary hover:text-active-primary/90 hover:underline"
            >
              Go to findings
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Card className="border-2 border-primary bg-secondary text-gray-200 shadow-none">
        <CardHeader className="border-b border-primary pb-4">
          <CardTitle className="text-lg text-white">Agents</CardTitle>
          <CardDescription className="text-light-gray">
            Connectors that stream identity and traffic into Sentinel Flow for
            analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <AgentCoverageStrip
            total={metrics.agentsTotal}
            active={metrics.agentsActive}
            inactive={metrics.agentsInactive}
          />
        </CardContent>
        <CardFooter className="border-t border-primary pt-4">
          <Link
            to="/agents"
            className="text-sm font-medium text-active-primary hover:text-active-primary/90 hover:underline"
          >
            Manage agents
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
