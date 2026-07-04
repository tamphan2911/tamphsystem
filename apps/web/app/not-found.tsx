"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ShieldAlert } from "lucide-react";

const researchThemeKey = "research-theme-mode";

export default function NotFound() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(researchThemeKey);
    setTheme(storedTheme === "dark" ? "dark" : "light");
  }, []);

  const handleGoBack = () => {
    const referrer = document.referrer;

    if (referrer && referrer !== window.location.href) {
      window.location.assign(referrer);
      return;
    }

    window.location.assign("/");
  };

  return (
    <main
      className={`research-site-root flex min-h-screen items-center justify-center px-6 py-10 ${
        theme === "light" ? "research-theme-light" : "research-theme-dark"
      } bg-[#242424] text-[#E4E4E4]`}
    >
      <section className="w-full max-w-2xl border border-[#444444] bg-[#2C2C2C]">
        <div className="border-b border-[#444444] px-6 py-5">
          <div className="flex items-center gap-3">
            <ShieldAlert
              className="h-5 w-5 text-[#A8DADC]"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <p className="text-xs font-normal uppercase tracking-[0.18em] text-[#B0B0B0]">
              404
            </p>
          </div>
        </div>
        <div className="grid gap-5 px-6 py-8">
          <h1 className="text-2xl font-normal leading-tight text-[#E4E4E4] md:text-3xl">
            You are not allowed to access this page.
          </h1>
          <p className="max-w-xl text-sm leading-6 text-[#B0B0B0]">
            This page is unavailable, moved, or outside your current Research
            Hub access. Go back and continue from a page you can open.
          </p>
          <div>
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-flex cursor-pointer items-center gap-2 border border-[#A8DADC] bg-transparent px-4 py-2 text-sm font-normal text-[#A8DADC] transition-colors duration-180 ease-out hover:bg-[#263636] hover:text-[#C9F0F2]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
              Go back
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
