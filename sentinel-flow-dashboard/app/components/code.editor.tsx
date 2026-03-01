import { AlertCircle, Check, FileJson } from "lucide-react";
import { use, useEffect, useState } from "react";

// Code Editor Component for JSON Mapping
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
  description?: string;
  placeholder?: string;
  error?: string | null;
}

export default function CodeEditor({
  value,
  onChange,
  label,
  disabled = false,
  description,
  placeholder,
  error,
}: CodeEditorProps): React.ReactNode {
  const [lineCount, setLineCount] = useState(1);
  const [isValid, setIsValid] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Update line count
    const lines = newValue.split("\n").length;
    setLineCount(lines);

    // Validate JSON
    try {
      if (newValue.trim()) {
        JSON.parse(newValue);
        setIsValid(true);
      } else {
        setIsValid(true);
      }
    } catch {
      setIsValid(false);
    }
  };

  const formatJSON = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      onChange(formatted);
      setLineCount(formatted.split("\n").length);
      setIsValid(true);
    } catch {
      // Invalid JSON, don't format
    }
  };

  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  useEffect(() => {
    formatJSON();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-white text-sm font-medium">{label}</label>
          <FileJson size={14} className="text-gray-400" />
        </div>
        <div className="flex items-center gap-2">
          {!isValid && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              Invalid JSON
            </span>
          )}
          {isValid && value && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Check size={12} />
              Valid JSON
            </span>
          )}
          <button
            onClick={formatJSON}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            type="button"
          >
            Format
          </button>
        </div>
      </div>

      {description && <p className="text-gray-400 text-xs">{description}</p>}

      <div
        className={`relative rounded-lg border ${error ? "border-red-500" : isValid ? "border-gray-700" : "border-yellow-600/50"} bg-[#0d1117] overflow-hidden`}
      >
        {/* Editor Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-gray-800">
          <span className="text-xs text-gray-500 font-mono">
            identity.mapping.json
          </span>
        </div>

        {/* Editor Body */}
        <div className="flex">
          {/* Line Numbers */}
          <div className="flex-shrink-0 py-3 px-2 text-right bg-[#0d1117] border-r border-gray-800 select-none">
            {lineNumbers.map((num) => (
              <div
                key={num}
                className="text-xs text-gray-600 font-mono leading-5"
              >
                {num}
              </div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            spellCheck={false}
            className="flex-1 py-3 px-3 bg-transparent text-gray-300 font-mono text-xs leading-5 resize-none focus:outline-none min-h-[200px] w-full"
            style={{
              tabSize: 2,
            }}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
