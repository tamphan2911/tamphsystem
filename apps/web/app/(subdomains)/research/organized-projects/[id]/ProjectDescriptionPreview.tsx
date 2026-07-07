"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";

export function ProjectDescriptionPreview({
  description,
}: {
  description: string;
}) {
  const [open, setOpen] = useState(false);
  const cleanDescription = description.trim();
  if (!cleanDescription) return null;
  const isLongDescription =
    cleanDescription.length > 240 || cleanDescription.split(/\r?\n/).length > 3;

  return (
    <>
      <p className="mt-1 max-w-4xl text-sm leading-6 text-[#667085] dark:text-[#B0B0B0]">
        <span className="line-clamp-3 whitespace-pre-wrap">
          {cleanDescription}
        </span>
        {isLongDescription ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="research-allow-transform mt-1 inline-flex border-0 bg-transparent p-0 text-xs font-normal text-[#1F7180] shadow-none outline-none transition duration-180 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#155864] hover:shadow-none focus-visible:ring-0 active:translate-y-0 active:scale-95 dark:text-[#A8DADC] dark:hover:text-cyan-200"
          >
            Show more
          </button>
        ) : null}
      </p>
      <ResearchModal
        open={open}
        onClose={() => setOpen(false)}
        title="Project description"
        icon={<FileText className="h-5 w-5" />}
        maxWidth="max-w-3xl"
      >
        <div className="border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#2C2C2C]">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#E4E4E4]">
            {cleanDescription}
          </p>
        </div>
      </ResearchModal>
    </>
  );
}
