"use client";

import dynamic from "next/dynamic";

export const VantaNetBackgroundClient = dynamic(
  () => import("./VantaNetBackground").then((mod) => mod.VantaNetBackground),
  { ssr: false }
);
