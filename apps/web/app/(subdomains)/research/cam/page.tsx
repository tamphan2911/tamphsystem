import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "LittleLog — Cam's Baby Care",
  description: "Cam's securely synced feeding, diaper, sleep, and care log.",
};

export default async function CamBabyCarePage() {
  const userAgent = (await headers()).get("user-agent") ?? "";
  const isPhone = /iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|BB10|Opera Mini|IEMobile/i.test(userAgent) && !/iPad|Tablet/i.test(userAgent);

  if (!isPhone) {
    return (
      <main className="fixed inset-0 grid place-items-center overflow-auto bg-[#f7f7fb] px-5 py-8 font-sans text-[#22213a]">
        <section className="w-full max-w-md rounded-[28px] border border-white bg-white px-8 py-10 text-center shadow-[0_22px_60px_rgba(39,35,76,0.12)]">
          <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-[#eeebff] text-2xl text-[#6b59d3]" aria-hidden="true">✦</div>
          <h1 className="text-2xl font-semibold tracking-tight">LittleLog is for phones</h1>
          <p className="mt-3 text-sm leading-6 text-[#747387]">Please open Cam’s baby care page on a phone.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#f7f7fb]">
      <iframe
        className="h-full w-full border-0"
        src="/cam-app/index.html?v=20261125o"
        title="LittleLog — Cam's Baby Care"
      />
    </main>
  );
}
