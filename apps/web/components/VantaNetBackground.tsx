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
    const color = resolvedTheme === "dark" ? 0x111827 : 0xdbeafe;

    if (vantaRef.current) {
      import("vanta/dist/vanta.waves.min").then((vantaModule) => {
        if (cancelled || !vantaRef.current) return;
        const WAVES = vantaModule.default || vantaModule;
        effect = WAVES({
          el: vantaRef.current,
          THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color,
          waveHeight: 30.50,
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
