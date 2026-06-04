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
        className="mx-3 mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-[#d6cfc4] bg-[#f1eee8] text-[#655d6d] shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#ffb38a] hover:bg-white hover:text-[#ff6d3a] hover:shadow-md motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-[#51495d] dark:bg-[#211c2d] dark:text-[#d7d1df] dark:hover:border-[#ff8a3d]/50 dark:hover:bg-[#2a2534] dark:hover:text-[#ffb38a]"
      >
        <LifeBuoy className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div
      onDoubleClick={() => setFlipped((value) => !value)}
      className="group m-4 cursor-pointer [perspective:900px]"
    >
      <div
        className={`relative min-h-40 rounded-lg border border-[#d6cfc4] bg-[#f1eee8]/90 shadow-sm transition duration-500 ease-out [transform-style:preserve-3d] group-hover:-translate-y-0.5 group-hover:border-[#ffb38a] group-hover:bg-white group-hover:shadow-md motion-reduce:transition-none motion-reduce:group-hover:translate-y-0 dark:border-[#403849] dark:bg-[#1b1724]/90 dark:group-hover:border-[#ff8a3d]/45 dark:group-hover:bg-[#211c2d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 flex flex-col justify-center p-4 [backface-visibility:hidden]">
          <p className="text-sm font-bold text-[#17131d] dark:text-white">
            Need support?
          </p>
          <p className="mt-1 text-xs leading-5 text-[#655d6d] dark:text-[#aaa4b5]">
            Find me! Yes, you know who to look for. If not, this place is not
            for you!
          </p>
        </div>

        <div className="absolute inset-0 flex flex-col justify-center rounded-lg bg-white/94 p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] dark:bg-[#14101d]/96">
          <p className="text-sm font-bold text-[#17131d] dark:text-white">
            Alright, you found me
          </p>
          <p className="mt-1 text-xs leading-5 text-[#655d6d] dark:text-[#aaa4b5]">
            Just kidding, boss. Pull up here when the system starts acting
            dramatic.
          </p>
          <div className="mt-3 space-y-1.5 text-xs font-semibold text-[#423b49] dark:text-[#d7d1df]">
            <p>tamphan.ntc@gmail.com</p>
            <p>0798109293</p>
          </div>
        </div>
      </div>
    </div>
  );
}
