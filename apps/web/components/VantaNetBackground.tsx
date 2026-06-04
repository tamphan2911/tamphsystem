"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { useTheme } from "next-themes";

export function VantaNetBackground({
  children,
  className = "absolute inset-0 z-0",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const vantaRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let effect: any;
    let cancelled = false;
    const backgroundColor = resolvedTheme === "dark" ? 0x050313 : 0xf6f4ef;

    if (vantaRef.current) {
      import("vanta/dist/vanta.net.min").then((vantaModule) => {
        if (cancelled || !vantaRef.current) return;
        const NET = vantaModule.default || vantaModule;
        effect = NET({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0xff3fbb,
          backgroundColor: backgroundColor,
          points: 20.00,
          maxDistance: 17.00,
          spacing: 16.00,
          showDots: true
        });
        setVantaEffect(effect);
      });
    }

    return () => {
      cancelled = true;
      if (effect) effect.destroy();
    };
  }, [resolvedTheme]);

  return (
    <div ref={vantaRef} className={className}>
      {children ? (
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
