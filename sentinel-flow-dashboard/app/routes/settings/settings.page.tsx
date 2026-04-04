import { Settings } from "lucide-react";
import { data, Link, useFetcher, useLoaderData } from "react-router";
import type { Route } from "./+types/settings.page";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { getSessionFromRequest } from "~/.server/libs/sessions";
import { getUserByIdService } from "~/.server/services/user.service";
import {
  getLearningScanSettings,
  upsertLearningScanSettings,
} from "~/.server/services/learning.scan.settings.service";
import {
  parseLearningScanSettingsValue,
  type LearningScanSettings,
} from "~/lib/learning-scan-settings";

export async function loader() {
  const settings = await getLearningScanSettings();
  return data({ settings }, { status: 200 });
}

function parseFormLearningScanSettings(
  formData: FormData,
): { ok: true; settings: LearningScanSettings } | { ok: false; error: string } {
  const raw = {
    learning_window_days: Number(formData.get("learning_window_days")),
    violation_threshold_percent: Number(formData.get("violation_threshold_percent")),
    minimum_sample_size: Number(formData.get("minimum_sample_size")),
    resource_dominance_percent: Number(formData.get("resource_dominance_percent")),
  };
  if (
    !Number.isFinite(raw.learning_window_days) ||
    !Number.isFinite(raw.violation_threshold_percent) ||
    !Number.isFinite(raw.minimum_sample_size) ||
    !Number.isFinite(raw.resource_dominance_percent)
  ) {
    return { ok: false, error: "All fields must be valid numbers." };
  }
  const settings = parseLearningScanSettingsValue(raw);
  return { ok: true, settings };
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false as const, error: "Method not allowed" }, { status: 405 });
  }

  const formData = await request.formData();
  const parsed = parseFormLearningScanSettings(formData);
  if (!parsed.ok) {
    return data({ success: false as const, error: parsed.error }, { status: 400 });
  }

  let updatedBy: string | null = null;
  const session = await getSessionFromRequest(request);
  const userId = session.get("userId") as string | undefined;
  if (userId) {
    const user = await getUserByIdService(userId);
    updatedBy = user?.email ?? userId;
  }

  try {
    await upsertLearningScanSettings(parsed.settings, updatedBy);
    return data({ success: true as const, settings: parsed.settings }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save learning scan settings";
    return data({ success: false as const, error: message }, { status: 500 });
  }
}

export default function SettingsPage() {
  const { settings: initial } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const settings =
    fetcher.data?.success === true ? fetcher.data.settings : initial;

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 text-gray-200">
      <header className="flex flex-col gap-3 border-b-2 border-primary pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-active-primary/40 bg-active-primary/15 text-active-primary shadow-sm">
            <Settings className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              Learning scan parameters are stored here and included automatically when you
              queue a run from{" "}
              <Link
                to="/learn-mappping"
                className="text-active-primary underline-offset-2 hover:underline"
              >
                Learn Mappings
              </Link>
              . They override the detection engine defaults for that run only.
            </p>
          </div>
        </div>
      </header>

      <section className="max-w-xl space-y-6 rounded-lg border border-primary bg-secondary p-6">
        <h2 className="text-lg font-medium text-white">Learning scan</h2>
        <fetcher.Form
          key={JSON.stringify(settings)}
          method="post"
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="learning_window_days" className="text-white">
              Learning window (days)
            </Label>
            <Input
              id="learning_window_days"
              name="learning_window_days"
              type="number"
              min={1}
              max={3650}
              required
              defaultValue={settings.learning_window_days}
              className="border-primary bg-primary-foreground text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">
              How far back request logs are considered for RBAC and IDOR learning.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="violation_threshold_percent" className="text-white">
              Violation threshold (%)
            </Label>
            <Input
              id="violation_threshold_percent"
              name="violation_threshold_percent"
              type="number"
              min={0}
              max={100}
              step="any"
              required
              defaultValue={settings.violation_threshold_percent}
              className="border-primary bg-primary-foreground text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">
              RBAC: minimum role share (%) for an endpoint to be treated as allowed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimum_sample_size" className="text-white">
              Minimum sample size
            </Label>
            <Input
              id="minimum_sample_size"
              name="minimum_sample_size"
              type="number"
              min={1}
              required
              defaultValue={settings.minimum_sample_size}
              className="border-primary bg-primary-foreground text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">
              Applied to both RBAC endpoint stats and IDOR resource learning for the scan
              message (same as detection-engine scan consumer).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="resource_dominance_percent" className="text-white">
              Resource dominance (%)
            </Label>
            <Input
              id="resource_dominance_percent"
              name="resource_dominance_percent"
              type="number"
              min={0}
              max={100}
              step="any"
              required
              defaultValue={settings.resource_dominance_percent}
              className="border-primary bg-primary-foreground text-white placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-400">
              IDOR: minimum top-user access share (%) to learn a resource owner mapping.
            </p>
          </div>

          {fetcher.data?.success === false && (
            <p className="text-sm text-destructive" role="alert">
              {fetcher.data.error}
            </p>
          )}
          {fetcher.data?.success === true && (
            <p className="text-sm text-emerald-400">Saved.</p>
          )}

          <Button
            type="submit"
            disabled={fetcher.state !== "idle"}
            className="bg-active-primary text-white hover:bg-active-primary/50 disabled:opacity-60"
          >
            {fetcher.state !== "idle" ? "Saving…" : "Save"}
          </Button>
        </fetcher.Form>
      </section>
    </div>
  );
}
