/** Matches agents table: “online” when last heartbeat within this many minutes. */
export const AGENT_ONLINE_THRESHOLD_MINUTES = 5;

export type RequestLogDailyCount = {
  /** ISO date yyyy-mm-dd */
  dateKey: string;
  /** Short label for axis */
  label: string;
  count: number;
};
