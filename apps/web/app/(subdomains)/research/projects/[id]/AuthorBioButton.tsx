"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { IconHint } from "@/sites/research/components/ResearchPrimitives";

export function AuthorBioButton({
  authorName,
  bio,
}: {
  authorName: string;
  bio: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconHint label={`View ${authorName}'s bio`} position="bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-sky-700 shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-sky-800 hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-[#C9F0F2]"
          aria-label={`View ${authorName}'s bio`}
        >
          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </IconHint>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={`${authorName} bio`}
        icon={<FileText className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#E4E4E4]">
          {bio}
        </p>
      </ResearchModal>
    </>
  );
}
