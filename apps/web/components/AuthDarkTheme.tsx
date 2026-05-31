"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function AuthDarkTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("dark");
  }, [setTheme]);

  return null;
}
