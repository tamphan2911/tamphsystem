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
}: {
  name: string;
  accept?: string;
  label?: string;
  helper?: string;
  currentFileName?: string;
  disabled?: boolean;
  required?: boolean;
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
        className={`group flex min-h-12 items-center gap-3 border border-[#444444] bg-[#202020] px-3 py-2 text-sm font-normal text-[#B0B0B0] transition duration-200 ease-out ${
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:-translate-y-0.5 hover:border-[#A8DADC] hover:bg-[#263636] hover:text-[#E4E4E4]"
        }`}
      >
        <FileUp
          className="h-4 w-4 flex-none text-[#A8DADC] transition duration-200 ease-out group-hover:text-[#C9F0F2]"
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1 truncate">
          <span className={selectedName ? "text-[#E4E4E4]" : "text-[#777777]"}>
            {displayName}
          </span>
          {currentFileName && !selectedName && (
            <span className="ml-2 text-xs text-[#B0B0B0]">
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
            className="inline-flex h-7 w-7 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition duration-200 ease-out hover:text-[#E4E4E4]"
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
        <p className="text-xs font-normal leading-5 text-[#777777]">{helper}</p>
      )}
    </div>
  );
}
