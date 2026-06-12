"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type TurnstileFieldProps = {
  siteKey?: string;
  resetKey?: number;
  theme?: "auto" | "light" | "dark";
};

type TurnstileStatus = "loading" | "ready" | "verified" | "expired" | "error";

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: Record<string, string | boolean | (() => void)>,
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
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
  const [status, setStatus] = useState<TurnstileStatus>("loading");

  useEffect(() => {
    if (window.turnstile) {
      setScriptReady(true);
      return;
    }

    const poll = window.setInterval(() => {
      if (window.turnstile) {
        setScriptReady(true);
        window.clearInterval(poll);
      }
    }, 250);

    const timeout = window.setTimeout(() => {
      if (!window.turnstile) setStatus("error");
    }, 10000);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(timeout);
    };
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

    setStatus("loading");

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      "response-field": true,
      "response-field-name": "cf-turnstile-response",
      retry: "auto",
      "retry-interval": "8000",
      "refresh-expired": "auto",
      "refresh-timeout": "auto",
      callback: () => setStatus("verified"),
      "after-interactive-callback": () => setStatus("ready"),
      "expired-callback": () => setStatus("expired"),
      "timeout-callback": () => setStatus("error"),
      "error-callback": () => setStatus("error"),
    });
    setStatus("ready");

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, scriptReady, resetKey, theme]);

  if (!siteKey) return null;

  function retryWidget() {
    if (widgetIdRef.current && window.turnstile) {
      setStatus("loading");
      window.turnstile.reset(widgetIdRef.current);
      return;
    }
    setScriptReady(Boolean(window.turnstile));
  }

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onReady={() => setScriptReady(true)}
        onError={() => setStatus("error")}
      />
      <div className="grid gap-2">
        <div
          className={
            theme === "dark"
              ? "turnstile-field turnstile-field-dark flex min-h-[4.25rem] w-full items-center justify-start overflow-hidden"
              : "turnstile-field turnstile-field-light flex min-h-[4.25rem] w-full items-center justify-start overflow-hidden py-0"
          }
        >
          <div ref={containerRef} className="max-w-full" />
        </div>
        {status === "loading" ? (
          <p className="turnstile-status-text">Loading security check...</p>
        ) : null}
        {status === "expired" || status === "error" ? (
          <div className="turnstile-status-row">
            <span>
              {status === "expired"
                ? "Security check expired."
                : "Security check could not load."}
            </span>
            <button type="button" onClick={retryWidget}>
              Retry
            </button>
          </div>
        ) : null}
      </div>
    </>
  );
}
