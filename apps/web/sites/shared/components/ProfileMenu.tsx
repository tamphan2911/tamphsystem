"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, Settings, UserCircle } from "lucide-react";

type ProfileMenuProps = {
  email?: string | null;
  name?: string | null;
  profileHref?: string;
  adminHref?: string;
};

export function ProfileMenu({
  email,
  name,
  profileHref = "/profile",
  adminHref = "https://admin.tamph.com",
}: ProfileMenuProps) {
  function signOutToCurrentLogin() {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    void signOut({ callbackUrl: `${origin}/login` });
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:text-blue-300"
        aria-label="Open profile menu"
      >
        <UserCircle className="h-5 w-5" />
      </button>

      <div className="pointer-events-none absolute right-0 top-12 z-50 w-64 translate-y-2 overflow-hidden rounded-none border border-slate-200 bg-white opacity-0 shadow-xl ring-1 ring-slate-950/5 transition duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100 dark:border-slate-800 dark:bg-slate-900 dark:ring-white/10">
        <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
          <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
            {name || "Account"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {email || "Not signed in"}
          </p>
        </div>

        <div>
          <Link
            href={profileHref}
            className="flex items-center gap-3 border-y border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <UserCircle className="h-4 w-4 text-slate-400" />
            Profile
          </Link>
          <Link
            href={adminHref}
            className="flex items-center gap-3 border-y border-transparent px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Admin console
          </Link>
          <button
            type="button"
            onClick={signOutToCurrentLogin}
            className="flex w-full items-center gap-3 border-y border-transparent px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:border-red-100 hover:bg-red-50 dark:text-red-400 dark:hover:border-red-900/60 dark:hover:bg-red-950/40"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
