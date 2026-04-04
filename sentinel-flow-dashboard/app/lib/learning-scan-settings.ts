/**
 * Persisted under `configurations.key` and sent on each queued learning scan (Kafka).
 * Matches detection-engine `ScanRequestMessage` field names.
 */
export const LEARNING_SCAN_CONFIG_KEY = "detection.learning_scan" as const;

export type LearningScanSettings = {
  learning_window_days: number;
  violation_threshold_percent: number;
  minimum_sample_size: number;
  resource_dominance_percent: number;
};

/** Aligns with detection-engine env defaults (see `internal/config/config.go`). */
export const DEFAULT_LEARNING_SCAN_SETTINGS: LearningScanSettings = {
  learning_window_days: 90,
  violation_threshold_percent: 5,
  minimum_sample_size: 100,
  resource_dominance_percent: 95,
};

const BOUNDS = {
  learning_window_days: { min: 1, max: 3650 },
  violation_threshold_percent: { min: 0, max: 100 },
  minimum_sample_size: { min: 1, max: 10_000_000 },
  resource_dominance_percent: { min: 0, max: 100 },
} as const;

function clampInt(name: keyof typeof BOUNDS, v: number): number {
  const { min, max } = BOUNDS[name];
  return Math.min(max, Math.max(min, Math.trunc(v)));
}

function clampFloat(name: keyof typeof BOUNDS, v: number): number {
  const { min, max } = BOUNDS[name];
  if (!Number.isFinite(v)) return DEFAULT_LEARNING_SCAN_SETTINGS[name];
  return Math.min(max, Math.max(min, v));
}

function numFromJson(
  raw: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const v = raw[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

/**
 * Parses `configurations.value` JSON. Invalid or partial documents fall back to defaults per field.
 */
export function parseLearningScanSettingsValue(raw: unknown): LearningScanSettings {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_LEARNING_SCAN_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  return {
    learning_window_days: clampInt(
      "learning_window_days",
      numFromJson(o, "learning_window_days", DEFAULT_LEARNING_SCAN_SETTINGS.learning_window_days),
    ),
    violation_threshold_percent: clampFloat(
      "violation_threshold_percent",
      numFromJson(
        o,
        "violation_threshold_percent",
        DEFAULT_LEARNING_SCAN_SETTINGS.violation_threshold_percent,
      ),
    ),
    minimum_sample_size: clampInt(
      "minimum_sample_size",
      numFromJson(o, "minimum_sample_size", DEFAULT_LEARNING_SCAN_SETTINGS.minimum_sample_size),
    ),
    resource_dominance_percent: clampFloat(
      "resource_dominance_percent",
      numFromJson(
        o,
        "resource_dominance_percent",
        DEFAULT_LEARNING_SCAN_SETTINGS.resource_dominance_percent,
      ),
    ),
  };
}

export function toScanRequestPayload(settings: LearningScanSettings) {
  return {
    learning_window_days: settings.learning_window_days,
    violation_threshold_percent: settings.violation_threshold_percent,
    minimum_sample_size: settings.minimum_sample_size,
    resource_dominance_percent: settings.resource_dominance_percent,
  };
}
