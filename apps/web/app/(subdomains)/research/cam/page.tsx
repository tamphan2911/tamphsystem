import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LittleLog — Cam's Baby Care",
  description: "Cam's securely synced feeding, diaper, sleep, and care log.",
};

export default function CamBabyCarePage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f7f7fb]">
      <iframe
        className="h-full w-full border-0"
        src="/cam-app/index.html?v=20261124h"
        title="LittleLog — Cam's Baby Care"
      />
    </main>
  );
}
