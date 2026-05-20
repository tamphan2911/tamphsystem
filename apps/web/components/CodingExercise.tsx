"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";
import { Play } from "lucide-react";

export function CodingExercise({ 
  initialCode = "", 
  language = "python",
  expectedOutput = ""
}: { 
  initialCode?: string;
  language?: string;
  expectedOutput?: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("Executing code in browser sandbox...\n");
    
    // In a full implementation, we would initialize Pyodide here
    // For now, we simulate execution to demonstrate the UI flow
    setTimeout(() => {
      // Simulate basic execution
      if (code.includes('print("Hello World!")')) {
        setOutput("Hello World!\n");
      } else {
        setOutput("Error: Code did not produce expected output.");
      }
      setIsRunning(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {language}
        </span>
        <button 
          onClick={handleRunCode}
          disabled={isRunning}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          <Play className="w-4 h-4 fill-current" />
          {isRunning ? "Running..." : "Run Code"}
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative bg-[#1e1e1e]">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            roundedSelection: false,
          }}
        />
      </div>

      {/* Output Console */}
      <div className="h-48 bg-slate-950 border-t border-slate-800 flex flex-col">
        <div className="bg-slate-900 px-4 py-1.5 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Console Output</span>
        </div>
        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-slate-300 whitespace-pre-wrap">
          {output || <span className="text-slate-600 italic">Run your code to see output here...</span>}
        </div>
      </div>
    </div>
  );
}
