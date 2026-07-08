"use client";

import { useRouter } from "next/navigation";
import { UserRoundSearch } from "lucide-react";
import { ResearchModal } from "@/sites/research/components/ResearchModal";

export function AuthorBioModal({
  authorName,
  bio,
  researchId,
}: {
  authorName: string;
  bio: string;
  researchId: string;
}) {
  const router = useRouter();

  function close() {
    router.replace(`/projects/${encodeURIComponent(researchId)}`, {
      scroll: false,
    });
  }

  return (
    <ResearchModal
      open
      onClose={close}
      title={`${authorName} bio`}
      icon={<UserRoundSearch className="h-5 w-5" />}
      maxWidth="max-w-2xl"
    >
      <div className="border border-[#D8D0C2] bg-[#FFFDF8] p-4 dark:border-[#444444] dark:bg-[#2C2C2C]">
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-[#E4E4E4]">
          {bio.trim()}
        </p>
      </div>
    </ResearchModal>
  );
}
