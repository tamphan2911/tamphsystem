"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function ResearchPageHeaderPortal({
  children,
}: {
  children: ReactNode;
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    function updateTarget() {
      setTarget(
        document.getElementById(
          desktopQuery.matches
            ? "research-page-header"
            : "research-page-mobile-header",
        ),
      );
    }

    updateTarget();
    desktopQuery.addEventListener("change", updateTarget);
    return () => desktopQuery.removeEventListener("change", updateTarget);
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="research-page-header-content flex w-full min-w-0 items-center">
      {children}
    </div>,
    target,
  );
}
