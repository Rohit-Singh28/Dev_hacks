"use client";

import { useCallback, useRef, useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { Language } from "@/lib/types";
import {
  LANGUAGE_OPTIONS,
  LANGUAGE_DEFAULTS,
  MONACO_LANGUAGE_MAP,
} from "@/lib/constants";

interface CodeEditorProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  code: string;
  onCodeChange: (code: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  running: boolean;
  submitting: boolean;
}

export default function CodeEditor({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onRun,
  onSubmit,
  running,
  submitting,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  const handleLanguageChange = (newLang: Language) => {
    onLanguageChange(newLang);
    // Reset to default template for new language if editor is empty or has default
    const currentDefaults = Object.values(LANGUAGE_DEFAULTS);
    if (!code.trim() || currentDefaults.some((d) => code.trim() === d.trim())) {
      onCodeChange(LANGUAGE_DEFAULTS[newLang]);
    }
  };

  return (
    <div className="flex flex-col h-full border border-zinc-800 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-zinc-900 px-4 py-2 border-b border-zinc-800">
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value as Language)}
          className="bg-zinc-800 text-zinc-200 text-sm rounded px-3 py-1.5 border border-zinc-700 focus:outline-none focus:border-blue-500"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <button
            onClick={onRun}
            disabled={running || submitting}
            className="rounded bg-zinc-700 px-4 py-1.5 text-sm font-medium text-zinc-200 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {running ? "Running..." : "▶ Run Code"}
          </button>
          <button
            onClick={onSubmit}
            disabled={running || submitting}
            className="rounded bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Submitting..." : "✓ Submit"}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={MONACO_LANGUAGE_MAP[language]}
          value={code}
          onChange={(val) => onCodeChange(val || "")}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize: 14,
            fontFamily: "'Fira Code', 'Cascadia Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            wordWrap: "on",
            lineNumbers: "on",
            renderWhitespace: "selection",
            bracketPairColorization: { enabled: true },
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
