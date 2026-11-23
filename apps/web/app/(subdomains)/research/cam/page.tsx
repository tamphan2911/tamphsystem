import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LittleLog — Cam's Baby Care",
  description: "Cam's private-on-device feeding, diaper, sleep, and care log.",
};

export default function CamBabyCarePage() {
  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f7f7fb]">
      <iframe
        className="h-full w-full border-0"
        src="/cam-app/index.html"
        title="LittleLog — Cam's Baby Care"
      />
    </main>
  );
}
