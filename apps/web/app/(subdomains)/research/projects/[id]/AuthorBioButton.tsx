"use client";

import { useState } from "react";
import { UserRoundSearch } from "lucide-react";
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
  const cleanBio = bio.trim();

  return (
    <>
      <IconHint label={`View ${authorName}'s bio`} position="bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="research-allow-transform inline-flex h-5 w-5 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#B39CD0] dark:hover:text-[#C8B6E2]"
          aria-label={`View ${authorName}'s bio`}
        >
          <UserRoundSearch className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </IconHint>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title={`${authorName} bio`}
        icon={<UserRoundSearch className="h-5 w-5" />}
        maxWidth="max-w-2xl"
      >
        <div className="border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#2C2C2C]">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#E4E4E4]">
            {cleanBio}
          </p>
        </div>
      </ResearchModal>
    </>
  );
}
