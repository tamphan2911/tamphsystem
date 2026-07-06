"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cx } from "./ResearchPrimitives";

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

export function AnimatedResize({
  children,
  className,
  contentClassName,
  style,
  contentStyle,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  style?: CSSProperties;
  contentStyle?: CSSProperties;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);

  useBrowserLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const updateHeight = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        const nextHeight = content.scrollHeight;
        setHeight((currentHeight) =>
          currentHeight === nextHeight ? currentHeight : nextHeight,
        );
      });
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(content);
    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className={cx(
        "transition-[height] duration-200 ease-out motion-reduce:transition-none",
        className,
      )}
      style={{
        ...style,
        height: height == null ? undefined : `${height}px`,
      }}
    >
      <div ref={contentRef} className={contentClassName} style={contentStyle}>
        {children}
      </div>
    </div>
  );
}
