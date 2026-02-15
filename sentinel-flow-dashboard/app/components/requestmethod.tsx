import { cn } from "~/lib/utils";
import { Badge } from "./ui/badge";

export default function RequestMethod({
  method,
}: {
  method: string | undefined;
}) {
  const getMethodColor = (method: string | undefined) => {
    switch (method) {
      case "GET":
        return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300";
      case "POST":
        return "bg-blue-500";
      case "DELETE":
        return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300";
      case "PUT":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300";
      case "PATCH":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300";
    }
  };

  return (
    <Badge className={cn(getMethodColor(method), "text-white")}>{method}</Badge>
  );
}
