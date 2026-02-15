import { Badge } from "./ui/badge";
import { getReasonPhrase } from "http-status-codes";

export default function StatusCode({
  status,
}: {
  status: number | undefined | null;
}) {
  if (!status) return null;

  const getStatusCodeColor = (status: number) => {
    if (status >= 200 && status < 300) {
      return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
    } else if (status >= 300 && status < 400) {
      return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
    } else if (status >= 400 && status < 600) {
      return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
    }
    // For 1xx informational responses or unknown
    return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300";
  };

  return (
    <Badge className={getStatusCodeColor(status)}>
      {status} {getReasonPhrase(status)}
    </Badge>
  );
}
