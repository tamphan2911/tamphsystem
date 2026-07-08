"use client";

import Link from "next/link";
import { UserRoundSearch } from "lucide-react";
import { useState } from "react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";

export function AuthorBioButton({
  authorId,
  authorName,
  bio,
  researchId,
}: {
  authorId?: string;
  authorName: string;
  bio?: string | null;
  researchId?: string;
}) {
  const [open, setOpen] = useState(false);
  const cleanBio = bio?.trim() ?? "";

  if (!authorId || !researchId) {
    return (
      <>
        <button
          type="button"
          title={`View ${authorName}'s bio`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          className="research-allow-transform pointer-events-auto relative z-20 inline-flex h-7 w-7 cursor-pointer touch-manipulation items-center justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#B39CD0] dark:hover:text-[#C8B6E2]"
          aria-haspopup="dialog"
          aria-label={`View ${authorName}'s bio`}
        >
          <UserRoundSearch className="h-4 w-4" aria-hidden="true" />
        </button>
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

  return (
    <Link
      href={`/projects/${encodeURIComponent(researchId)}?authorBio=${encodeURIComponent(authorId)}`}
      scroll={false}
      title={`View ${authorName}'s bio`}
      className="research-allow-transform pointer-events-auto relative z-20 inline-flex h-7 w-7 cursor-pointer touch-manipulation items-center justify-center border-0 bg-transparent p-0 text-[#1F7180] shadow-none outline-none transition-[color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#B39CD0] dark:hover:text-[#C8B6E2]"
      aria-haspopup="dialog"
      aria-label={`View ${authorName}'s bio`}
    >
      <UserRoundSearch className="h-4 w-4" aria-hidden="true" />
    </Link>
  );
}
