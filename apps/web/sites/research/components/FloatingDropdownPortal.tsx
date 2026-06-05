"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type FloatingDropdownStyle = CSSProperties & {
  "--research-dropdown-max-height"?: string;
};

export function FloatingDropdownPortal({
  anchorRef,
  open,
  children,
  offset = 8,
  maxWidth = 480,
  matchAnchorWidth = true,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  children: ReactNode;
  offset?: number;
  maxWidth?: number;
  matchAnchorWidth?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [style, setStyle] = useState<FloatingDropdownStyle | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const viewportPadding = 16;
      const availableBelow = window.innerHeight - rect.bottom - offset;
      const availableAbove = rect.top - offset;
      const placeAbove =
        availableBelow < 180 && availableAbove > availableBelow;
      const maxPanelHeight = Math.max(
        140,
        Math.min(
          320,
          placeAbove
            ? availableAbove - viewportPadding
            : availableBelow - viewportPadding,
        ),
      );
      const minWidth = Math.ceil(rect.width);
      const panelWidth = matchAnchorWidth
        ? Math.min(minWidth, window.innerWidth - viewportPadding * 2)
        : Math.min(
            Math.max(
              minWidth,
              Math.min(maxWidth, window.innerWidth - viewportPadding * 2),
            ),
            window.innerWidth - viewportPadding * 2,
          );
      const left = Math.min(
        Math.max(viewportPadding, rect.left),
        window.innerWidth - viewportPadding - panelWidth,
      );

      setStyle({
        left,
        width: panelWidth,
        minWidth,
        maxWidth: Math.min(maxWidth, window.innerWidth - viewportPadding * 2),
        top: placeAbove ? undefined : rect.bottom + offset,
        bottom: placeAbove ? window.innerHeight - rect.top + offset : undefined,
        "--research-dropdown-max-height": `${maxPanelHeight}px`,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef, matchAnchorWidth, maxWidth, offset, open]);

  if (!mounted || !open || !style) return null;

  return createPortal(
    <div
      className="research-dropdown-floating-panel fixed z-[1100]"
      style={style}
    >
      {children}
    </div>,
    document.body,
  );
}
