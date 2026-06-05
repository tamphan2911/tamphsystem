"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function updateVisibility() {
      setVisible(window.scrollY > 320);
    }

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-6 right-6 z-50 inline-flex h-10 w-10 cursor-pointer items-center justify-center border border-[#444444] bg-[#F7F7F5] text-[#2F6F7A] shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition duration-200 ease-out hover:border-[#2F6F7A] hover:bg-[#EFEFEC] hover:text-[#252525] focus:outline-none focus-visible:border-[#2F6F7A] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/45 dark:bg-[#2C2C2C] dark:text-[#A8DADC] dark:shadow-black/30 dark:hover:border-[#A8DADC] dark:hover:bg-[#333333] dark:hover:text-[#E4E4E4] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
