import { CheckCircle2, Copy, Terminal } from "lucide-react";

interface TerminalBlockProps {
  command: string;
  onCopy: () => void;
  copied: boolean;
}

export function TerminalBlock({
  command,
  onCopy,
  copied,
}: TerminalBlockProps): React.ReactNode {
  const escapeHtml = (unsafe: string): string => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const highlightCommand = (cmd: string): string => {
    // Escape the raw input ONCE before any span injection
    const escaped = cmd
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    // Do NOT escape quotes — they'll break span class attributes below

    let result = escaped;

    // Comments
    result = result.replace(
      /^(#\s.*)$/gm,
      '<span class="text-gray-500">$1</span>',
    );

    // URLs (before flags, so -s in https:// isn't highlighted as a flag)
    result = result.replace(
      /(https?:\/\/[^\s]+)/g,
      '<span class="text-green-400">$1</span>',
    );

    // Flags — skip anything already inside a span
    result = result.replace(
      /(\s)(--?[a-zA-Z][a-zA-Z-]*)(?=[^\w]|$)/g,
      '$1<span class="text-yellow-300">$2</span>',
    );

    // Commands at start of line
    result = result.replace(
      /^(curl|wget|bash|sh|sudo|chmod|echo|export|cd|mkdir|rm|mv|cp|systemctl|docker|kubectl)(?=\s)/gm,
      '<span class="text-pink-400">$1</span>',
    );

    // Commands after pipe
    result = result.replace(
      /(\|\s*)(bash|sh|sudo)(?=\s)/g,
      '$1<span class="text-pink-400">$2</span>',
    );

    // Token/value strings (after -- flags)
    result = result.replace(
      /(\s)([a-zA-Z0-9_\-\.]+\.\.\.[a-zA-Z0-9]+)/g,
      '$1<span class="text-orange-300">$2</span>',
    );

    // Environment variables
    result = result.replace(
      /(\$[A-Z_][A-Z0-9_]*)/g,
      '<span class="text-cyan-400">$1</span>',
    );

    return result;
  };

  const lines = command.split("\n");

  return (
    <div className="rounded-lg overflow-hidden bg-[#0d1117] border border-gray-800">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#161b22] border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Terminal size={16} className="text-gray-400" />
          <span className="text-xs text-gray-400 font-mono">install.sh</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">bash</span>
          <button
            onClick={onCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs transition-colors"
          >
            {copied ? (
              <>
                <CheckCircle2 size={12} className="text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="p-4">
        <pre className="font-mono text-sm leading-relaxed">
          {lines.map((line, index) => (
            <div key={index} className="flex">
              <span className="text-gray-600 select-none mr-3 w-6 text-right flex-shrink-0">
                {index + 1}
              </span>
              <code
                className="text-gray-300 whitespace-pre-wrap break-all"
                dangerouslySetInnerHTML={{
                  __html:
                    highlightCommand(line) ||
                    '<span class="text-gray-600"> </span>',
                }}
              />
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
