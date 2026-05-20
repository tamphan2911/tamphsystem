"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { useTheme } from "next-themes";

export function VantaNetBackground({ children }: { children: React.ReactNode }) {
  const [vantaEffect, setVantaEffect] = useState<any>(null);
  const vantaRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    let effect: any;
    
    // Set colors based on theme to match "Trust & Authority"
    // Dark mode: Deep slate/navy background (slate-950) with vibrant blue network
    // Light mode: Slate-50 background with strong blue network
    const backgroundColor = resolvedTheme === "dark" ? 0x020617 : 0xf8fafc;
    const color = resolvedTheme === "dark" ? 0x3b82f6 : 0x2563eb; 

    if (vantaRef.current) {
      // Safely import Vanta only on the client
      import("vanta/dist/vanta.net.min").then((vantaModule) => {
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
          color: color,
          backgroundColor: backgroundColor,
          points: 15.00,
          maxDistance: 22.00,
          spacing: 18.00,
          showDots: true
        });
        setVantaEffect(effect);
      });
    }

    return () => {
      if (effect) effect.destroy();
    };
  }, [resolvedTheme]);

  return (
    <div ref={vantaRef} className="absolute inset-0 z-0">
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}
