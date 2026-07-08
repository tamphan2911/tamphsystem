"use client";

import { useEffect, useId, useState } from "react";
import { X, UserRoundSearch } from "lucide-react";
import { createPortal } from "react-dom";

export function AuthorBioButton({
  authorName,
  bio,
}: {
  authorName: string;
  bio: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const cleanBio = bio.trim();

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        title={`View ${authorName}'s bio`}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className="research-allow-transform pointer-events-auto relative z-20 inline-flex h-7 w-7 cursor-pointer touch-manipulation items-center justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#B39CD0] dark:hover:text-[#C8B6E2]"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`View ${authorName}'s bio`}
      >
        <UserRoundSearch className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              data-research-modal-overlay="true"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) setOpen(false);
              }}
              className="fixed inset-0 z-[1400] flex items-center justify-center overflow-y-auto bg-slate-950/45 px-2 py-3 animate-[modalOverlayIn_140ms_ease-out] sm:px-4 sm:py-8 dark:bg-black/68"
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl animate-[modalPanelIn_160ms_ease-out] flex-col overflow-hidden rounded-none border border-slate-200 bg-white text-slate-800 shadow-xl shadow-slate-950/14 sm:max-h-[90vh] dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:shadow-black/35"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:gap-4 sm:px-6 sm:py-5 dark:border-[#444444]">
                  <div className="flex min-w-0 items-center gap-3 text-left">
                    <div className="flex h-6 w-6 flex-none items-center justify-center text-sky-700 dark:text-[#B39CD0]">
                      <UserRoundSearch className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <h2
                      id={titleId}
                      className="break-words text-base font-normal text-slate-950 sm:text-lg dark:text-[#E4E4E4]"
                    >
                      {authorName} bio
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close"
                    className="research-allow-transform inline-flex h-8 w-8 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-slate-500 transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/25 active:translate-y-0 active:scale-95 dark:text-[#B0B0B0] dark:hover:text-[#E4E4E4] dark:focus-visible:ring-[#A8DADC]/35"
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                  <div className="border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#2C2C2C]">
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#E4E4E4]">
                      {cleanBio}
                    </p>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
