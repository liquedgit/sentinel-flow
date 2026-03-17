import ReactMarkdown from "react-markdown";
import rehypeSanitize, {
  defaultSchema,
  type Options,
} from "rehype-sanitize";
import { cn } from "~/lib/utils";

/** Strict schema: basic markdown only, no links or images. */
const strictSchema: Options = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (t: string) => t !== "a" && t !== "img",
  ),
};

interface MarkdownTextProps {
  content: string | null | undefined;
  fallback?: string;
  className?: string;
}

/**
 * Renders Markdown with strict sanitization (no raw HTML, no links).
 * Supports basic Markdown: bold, italic, inline code, lists, headings, paragraphs.
 */
export default function MarkdownText({
  content,
  fallback = "—",
  className,
}: MarkdownTextProps) {
  if (content == null || content.trim() === "") {
    return <span className={cn("text-gray-200", className)}>{fallback}</span>;
  }

  return (
    <div
      className={cn(
        "markdown-text text-sm text-gray-200 [&_p]:mb-2 [&_p:last-child]:mb-0",
        "[&_strong]:font-semibold [&_em]:italic",
        "[&_code]:rounded [&_code]:bg-slate-700/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs",
        "[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-800/50 [&_pre]:p-3 [&_pre]:text-xs",
        "[&_ul]:list-disc [&_ul]:list-inside [&_ul]:space-y-1 [&_ul]:my-2",
        "[&_ol]:list-decimal [&_ol]:list-inside [&_ol]:space-y-1 [&_ol]:my-2",
        "[&_li]:ml-2",
        "[&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1,h2,h3]:font-semibold [&_h1,h2,h3]:mt-3 [&_h1,h2,h3]:mb-1",
        className,
      )}
    >
      <ReactMarkdown rehypePlugins={[[rehypeSanitize, strictSchema]]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
