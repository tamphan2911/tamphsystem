"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";

export function SidebarSupportCard({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  if (collapsed) {
    return (
      <div
        aria-label="Contact support"
        title="Contact support"
        className="mx-3 mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-white hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
      >
        <LifeBuoy className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={() => setFlipped((value) => !value)}
      className="group m-4 cursor-pointer [perspective:900px]"
      title="Double click me"
    >
      <div
        className={`relative min-h-40 rounded-lg border border-slate-200 bg-slate-50 transition duration-[560ms] ease-out [transform-style:preserve-3d] group-hover:-translate-y-0.5 group-hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70 ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 flex flex-col justify-center p-4 [backface-visibility:hidden]">
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            Need support?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
            Find me! Yes, you know who to look for. If not, this place is not
            for you!
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-blue-500 dark:text-blue-300">
            Double click
          </p>
        </div>

        <div className="absolute inset-0 flex flex-col justify-center rounded-lg bg-white/80 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-slate-900/80">
          <p className="text-sm font-bold text-slate-950 dark:text-white">
            Alright, you found me
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">
            Just kidding, boss. Pull up here when the system starts acting
            dramatic.
          </p>
          <div className="mt-3 space-y-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <p>tamphan.ntc@gmail.com</p>
            <p>0798109293</p>
          </div>
        </div>
      </div>
    </div>
  );
}
