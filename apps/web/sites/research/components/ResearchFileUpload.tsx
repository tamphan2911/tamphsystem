"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileUp, X } from "lucide-react";

export function ResearchFileUpload({
  name,
  accept,
  label = "Choose file",
  helper,
  currentFileName,
  disabled = false,
  required = false,
  className = "",
}: {
  name: string;
  accept?: string;
  label?: string;
  helper?: string;
  currentFileName?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedName, setSelectedName] = useState("");
  const displayName = selectedName || label;

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const clearSelectedName = () => setSelectedName("");
    form.addEventListener("reset", clearSelectedName);
    return () => form.removeEventListener("reset", clearSelectedName);
  }, []);

  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={inputId}
        className={`group flex min-h-12 items-center gap-3 border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-600 transition duration-200 ease-out dark:border-[#444444] dark:bg-[#202020] dark:text-[#B0B0B0] ${className} ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:hover:border-[#A8DADC] dark:hover:bg-[#263636] dark:hover:text-[#E4E4E4]"
        }`}
      >
        <FileUp
          className="h-4 w-4 flex-none text-[#1F7180] transition duration-200 ease-out group-hover:text-[#155864] dark:text-[#A8DADC] dark:group-hover:text-[#C9F0F2]"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">
          <span
            className={
              selectedName
                ? "text-slate-900 dark:text-[#E4E4E4]"
                : "text-slate-500 dark:text-[#777777]"
            }
          >
            {displayName}
            {required ? (
              <span className="research-required-mark">(*)</span>
            ) : null}
          </span>
          {currentFileName && !selectedName && (
            <span className="ml-2 text-xs text-slate-500 dark:text-[#B0B0B0]">
              Current: {currentFileName}
            </span>
          )}
        </span>
        {selectedName && !disabled && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              const input = document.getElementById(
                inputId,
              ) as HTMLInputElement | null;
              if (input) input.value = "";
              setSelectedName("");
            }}
            className="inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-slate-500 transition duration-200 ease-out hover:text-slate-900 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4]"
            aria-label="Clear selected file"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          disabled={disabled}
          required={required}
          className="sr-only"
          onChange={(event) =>
            setSelectedName(event.currentTarget.files?.[0]?.name ?? "")
          }
        />
      </label>
      {helper && (
        <p className="text-xs font-normal leading-5 text-slate-500 dark:text-[#777777]">
          {helper}
        </p>
      )}
    </div>
  );
}
