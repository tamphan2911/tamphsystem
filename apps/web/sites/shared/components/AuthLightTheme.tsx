"use client";

import { useLayoutEffect } from "react";

let authThemeMountId = 0;

export function AuthTheme({ theme }: { theme: "light" | "dark" }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const opposite = theme === "dark" ? "light" : "dark";
    const hadTheme = root.classList.contains(theme);
    const hadOpposite = root.classList.contains(opposite);
    const mountId = ++authThemeMountId;

    root.classList.remove(opposite);
    root.classList.add(theme);

    return () => {
      window.setTimeout(() => {
        if (authThemeMountId !== mountId) return;
        root.classList.toggle(theme, hadTheme);
        root.classList.toggle(opposite, hadOpposite);
      }, 0);
    };
  }, [theme]);

  return null;
}

export function AuthLightTheme() {
  return <AuthTheme theme="light" />;
}

export function AuthDarkTheme() {
  return <AuthTheme theme="dark" />;
}
