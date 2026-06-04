"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileFieldProps = {
  siteKey?: string;
  resetKey?: number;
  theme?: "auto" | "light" | "dark";
};

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, string | boolean>,
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileField({
  siteKey,
  resetKey = 0,
  theme = "light",
}: TurnstileFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (window.turnstile) {
      setScriptReady(true);
    }
  }, []);

  useEffect(() => {
    if (
      !siteKey ||
      !scriptReady ||
      !containerRef.current ||
      !window.turnstile
    ) {
      return;
    }

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      "response-field": true,
      "response-field-name": "cf-turnstile-response",
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, scriptReady, resetKey, theme]);

  if (!siteKey) return null;

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
      />
      <div className="flex min-h-[4.25rem] w-full items-center justify-start overflow-hidden py-0">
        <div ref={containerRef} className="max-w-full" />
      </div>
    </>
  );
}
