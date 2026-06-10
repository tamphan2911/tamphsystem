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
    setTarget(document.getElementById("research-page-header"));
  }, []);

  if (!target) return null;

  return createPortal(
    <div className="flex w-full items-center">{children}</div>,
    target,
  );
}
