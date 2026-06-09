"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Settings, UserCircle } from "lucide-react";

type ProfileMenuProps = {
  email?: string | null;
  name?: string | null;
  profileHref?: string;
  adminHref?: string;
  variant?: "default" | "research";
};

export function ProfileMenu({
  email,
  name,
  profileHref = "/profile",
  adminHref = "https://admin.tamph.com",
  variant = "default",
}: ProfileMenuProps) {
  function signOutToCurrentLogin() {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    void signOut({ callbackUrl: `${origin}/login` });
  }

  const isResearch = variant === "research";

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-[#E4E4E4] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
        aria-label="Open profile menu"
      >
        <UserCircle className="h-6 w-6" />
      </button>

      <div
        className={`pointer-events-none absolute right-0 top-12 z-50 w-64 translate-y-2 overflow-hidden rounded-none border opacity-0 shadow-xl transition duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 ${
          isResearch
            ? "border-[#444444] bg-[#2C2C2C] shadow-black/30"
            : "border-slate-200 bg-white ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10"
        }`}
      >
        <div
          className={`border-b px-4 py-3 ${
            isResearch
              ? "border-[#444444]"
              : "border-slate-100 dark:border-slate-800"
          }`}
        >
          <p
            className={`truncate text-sm font-semibold ${
              isResearch ? "text-[#E4E4E4]" : "text-slate-950 dark:text-white"
            }`}
          >
            {name || "Account"}
          </p>
          <p
            className={`truncate text-xs ${
              isResearch ? "text-[#B0B0B0]" : "text-slate-500"
            }`}
          >
            {email || "Not signed in"}
          </p>
        </div>

        <div>
          <Link
            href={profileHref}
            className={`flex items-center gap-3 border-y border-transparent px-4 py-3 text-sm font-normal transition ${
              isResearch
                ? "text-[#E4E4E4] hover:border-[#444444] hover:bg-[#383838] hover:text-[#A8DADC]"
                : "text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
          >
            <UserCircle
              className={`h-4 w-4 ${
                isResearch ? "text-[#A8DADC]" : "text-slate-400"
              }`}
            />
            Profile
          </Link>
          <Link
            href={adminHref}
            className={`flex items-center gap-3 border-y border-transparent px-4 py-3 text-sm font-normal transition ${
              isResearch
                ? "text-[#E4E4E4] hover:border-[#444444] hover:bg-[#383838] hover:text-[#A8DADC]"
                : "text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
          >
            <Settings
              className={`h-4 w-4 ${
                isResearch ? "text-[#B0B0B0]" : "text-slate-400"
              }`}
            />
            Admin console
          </Link>
          <button
            type="button"
            onClick={signOutToCurrentLogin}
            className={`flex w-full items-center gap-3 border-y border-transparent px-4 py-3 text-left text-sm font-normal transition ${
              isResearch
                ? "text-[#F2A0AC] hover:border-[#444444] hover:bg-[#383838] hover:text-[#FFD0D6]"
                : "text-red-600 hover:border-red-100 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/40"
            }`}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
