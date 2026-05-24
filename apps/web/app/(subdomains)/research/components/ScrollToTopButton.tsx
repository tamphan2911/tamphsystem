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
      className={`fixed bottom-6 right-6 z-50 inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-900/10 ring-1 ring-white/70 backdrop-blur transition duration-300 ease-out hover:-translate-y-1 hover:border-emerald-300 hover:bg-emerald-100 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/15 dark:border-emerald-800/70 dark:bg-emerald-950/80 dark:text-emerald-200 dark:shadow-black/30 dark:ring-slate-800 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/80 ${
        visible
          ? "translate-y-0 scale-100 opacity-100"
          : "pointer-events-none translate-y-3 scale-95 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
