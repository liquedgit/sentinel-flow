function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Dashboard-wide UTC instant display, e.g. `2026-04-04 09:40:06 UTC`. */
export function formatDisplayDateTime(
  input: Date | string | number | null | undefined,
): string {
  if (input == null) return "—";
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getUTCFullYear();
  const m = pad2(d.getUTCMonth() + 1);
  const day = pad2(d.getUTCDate());
  const h = pad2(d.getUTCHours());
  const min = pad2(d.getUTCMinutes());
  const s = pad2(d.getUTCSeconds());
  return `${y}-${m}-${day} ${h}:${min}:${s} UTC`;
}
