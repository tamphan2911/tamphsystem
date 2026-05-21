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
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:text-blue-600 hover:shadow-md"
        aria-label="Open profile menu"
      >
        <UserCircle className="h-5 w-5" />
      </button>

      <div className="pointer-events-none absolute right-0 top-12 z-50 w-64 translate-y-2 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl ring-1 ring-slate-950/5 transition duration-200 ease-out group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        <div className="border-b border-slate-100 px-3 py-3">
          <p className="truncate text-sm font-bold text-slate-950">{name || "Account"}</p>
          <p className="truncate text-xs text-slate-500">{email || "Not signed in"}</p>
        </div>

        <div className="py-2">
          <Link
            href={profileHref}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <UserCircle className="h-4 w-4 text-slate-400" />
            Profile
          </Link>
          <Link
            href={adminHref}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            Admin console
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
