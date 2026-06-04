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
        className="mx-3 mb-4 flex h-11 w-11 items-center justify-center rounded-none border border-[#444444] bg-[#2C2C2C] text-[#B0B0B0] transition duration-150 ease-out hover:border-[#A8DADC] hover:bg-[#383838] hover:text-[#A8DADC]"
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
        className={`relative min-h-40 rounded-none border border-[#444444] bg-[#2C2C2C] transition duration-500 ease-out [transform-style:preserve-3d] group-hover:border-[#A8DADC] group-hover:bg-[#383838] motion-reduce:transition-none ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 flex flex-col justify-center p-4 [backface-visibility:hidden]">
          <p className="text-sm font-normal text-[#E4E4E4]">
            Need support?
          </p>
          <p className="mt-1 text-xs leading-5 text-[#B0B0B0]">
            Find me! Yes, you know who to look for. If not, this place is not
            for you!
          </p>
        </div>

        <div className="absolute inset-0 flex flex-col justify-center rounded-none bg-[#2C2C2C] p-4 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-sm font-normal text-[#E4E4E4]">
            Alright, you found me
          </p>
          <p className="mt-1 text-xs leading-5 text-[#B0B0B0]">
            Just kidding, boss. Pull up here when the system starts acting
            dramatic.
          </p>
          <div className="mt-3 space-y-1.5 text-xs font-normal text-[#E4E4E4]">
            <p>tamphan.ntc@gmail.com</p>
            <p>0798109293</p>
          </div>
        </div>
      </div>
    </div>
  );
}
