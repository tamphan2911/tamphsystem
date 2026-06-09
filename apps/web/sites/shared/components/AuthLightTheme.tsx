"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function AuthTheme({ theme }: { theme: "light" | "dark" }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme(theme);
  }, [setTheme, theme]);

  return null;
}

export function AuthLightTheme() {
  return <AuthTheme theme="light" />;
}

export function AuthDarkTheme() {
  return <AuthTheme theme="dark" />;
}
