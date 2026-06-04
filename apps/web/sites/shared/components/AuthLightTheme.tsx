"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function AuthLightTheme() {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  return null;
}
