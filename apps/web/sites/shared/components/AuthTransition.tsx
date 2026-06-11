"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type AuthMode = "login" | "register";

const storageKey = "tamph-auth-transition-mode";

export function AuthTransitionCard({
  mode,
  className,
  children,
}: {
  mode: AuthMode;
  className: string;
  children: ReactNode;
}) {
  const [motion, setMotion] = useState<"none" | "to-login" | "to-register">(
    "none",
  );

  useEffect(() => {
    delete document.documentElement.dataset.authLeaving;
    const previous =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem(storageKey)
        : null;

    if (previous === "login" && mode === "register") {
      setMotion("to-register");
    } else if (previous === "register" && mode === "login") {
      setMotion("to-login");
    }

    window.sessionStorage.setItem(storageKey, mode);
  }, [mode]);

  return (
    <div
      className="auth-flip-stage"
      data-auth-mode={mode}
      data-auth-motion={motion}
    >
      <div className={className}>{children}</div>
    </div>
  );
}

export function AuthSwitchLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const targetMode = useMemo<AuthMode | null>(() => {
    const path = href.split("?")[0] ?? "";
    if (path === "/login") return "login";
    if (path === "/register") return "register";
    return null;
  }, [href]);

  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (
      !targetMode ||
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    const currentMode = pathname === "/register" ? "register" : "login";
    if (currentMode === targetMode) return;

    event.preventDefault();
    window.sessionStorage.setItem(storageKey, currentMode);
    document.documentElement.dataset.authLeaving = targetMode;
    window.setTimeout(() => {
      router.push(href);
    }, 220);
  }

  return (
    <Link href={href} className={className} onClick={navigate}>
      {children}
    </Link>
  );
}
