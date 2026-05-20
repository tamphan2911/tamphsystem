"use client";

import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { Play, Loader2 } from "lucide-react";

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
  const [pyodide, setPyodide] = useState<any>(null);
  const [isLoadingPyodide, setIsLoadingPyodide] = useState(false);

  // Initialize Pyodide on mount if language is python
  useEffect(() => {
    if (language !== "python" || pyodide || isLoadingPyodide) return;

    const initPyodide = async () => {
      setIsLoadingPyodide(true);
      
      if (!document.getElementById('pyodide-script')) {
        const script = document.createElement('script');
        script.id = 'pyodide-script';
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
        document.head.appendChild(script);
        
        script.onload = async () => {
          try {
            // @ts-ignore
            const py = await window.loadPyodide();
            setPyodide(py);
          } catch (e) {
            console.error("Failed to load Pyodide", e);
          } finally {
            setIsLoadingPyodide(false);
          }
        };
      }
    };

    initPyodide();
  }, [language, pyodide, isLoadingPyodide]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput("Executing...\n");
    
    if (language === "python") {
      if (!pyodide) {
        setOutput("Error: Python runtime not fully loaded yet. Please wait a moment.");
        setIsRunning(false);
        return;
      }

      try {
        // Redirect Python stdout to our React state
        pyodide.runPython(`
          import sys
          from js import document
          
          class JSLogger:
              def write(self, text):
                  # We use a global JS function we'll define briefly
                  document.getElementById('python-stdout-bridge').value += text
                  document.getElementById('python-stdout-bridge').dispatchEvent(new Event('change'))
                  
          sys.stdout = JSLogger()
          sys.stderr = JSLogger()
        `);
        
        // Clear bridge
        const bridge = document.getElementById('python-stdout-bridge') as HTMLInputElement;
        if (bridge) bridge.value = "";
        
        // Run user code
        await pyodide.runPythonAsync(code);
        
        // Grab output from bridge
        if (bridge) {
            setOutput(bridge.value || "Code executed successfully with no output.\n");
        }
      } catch (err: any) {
        // Grab error trace
        setOutput(`Error:\n${err.message}\n`);
      } finally {
        setIsRunning(false);
      }
    } else {
      // Simulate execution for other languages
      setTimeout(() => {
        setOutput("Execution engine for this language is not yet connected.\n");
        setIsRunning(false);
      }, 500);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-16rem)] min-h-[500px] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      
      {/* Hidden input bridge for stdout */}
      <input type="hidden" id="python-stdout-bridge" />

      {/* Editor Toolbar */}
      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {language}
          </span>
          {isLoadingPyodide && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading runtime...
            </span>
          )}
        </div>
        <button 
          onClick={handleRunCode}
          disabled={isRunning || isLoadingPyodide}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors shadow-sm"
        >
          {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
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
