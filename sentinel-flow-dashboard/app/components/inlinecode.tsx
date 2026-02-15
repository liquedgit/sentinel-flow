import { cn } from "~/lib/utils";

interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export default function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        "rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800",
        "dark:bg-slate-800 dark:text-slate-200",
        "border border-slate-200 dark:border-slate-700",
        className,
      )}
    >
      {children}
    </code>
  );
}
