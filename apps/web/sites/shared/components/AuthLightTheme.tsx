"use client";

import { useLayoutEffect } from "react";

export function AuthTheme({ theme }: { theme: "light" | "dark" }) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const opposite = theme === "dark" ? "light" : "dark";
    const hadTheme = root.classList.contains(theme);
    const hadOpposite = root.classList.contains(opposite);

    root.classList.remove(opposite);
    root.classList.add(theme);

    return () => {
      root.classList.toggle(theme, hadTheme);
      root.classList.toggle(opposite, hadOpposite);
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
