"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useResearchToast } from "../components/ResearchToast";

export function ProjectToastFeedback() {
  const toast = useResearchToast();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current || searchParams.get("created") !== "project") return;

    shownRef.current = true;
    toast.showSuccess({
      title: "Project added",
      detail:
        "The project was created successfully and is ready for members, funding details, and linked research outputs.",
    });

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("created");
    const nextUrl = nextParams.toString()
      ? `${pathname}?${nextParams.toString()}`
      : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [pathname, router, searchParams, toast]);

  return null;
}
