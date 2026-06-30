"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  CalendarDays,
  LogOut,
  Settings,
  UserCircle,
  UsersRound,
} from "lucide-react";

type ProfileMenuProps = {
  email?: string | null;
  name?: string | null;
  profileHref?: string;
  calendarHref?: string;
  adminHref?: string;
  teamHref?: string;
  teamLabel?: string;
  showCalendar?: boolean;
  showAdminConsole?: boolean;
  showTeam?: boolean;
  variant?: "default" | "research";
};

export function ProfileMenu({
  email,
  name,
  profileHref = "/profile",
  calendarHref = "/calendar",
  adminHref = "https://admin.tamph.com",
  teamHref = "/team",
  teamLabel = "Team",
  showCalendar = false,
  showAdminConsole = false,
  showTeam = false,
  variant = "default",
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);

  function signOutToCurrentLogin() {
    setOpen(false);
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    void signOut({ callbackUrl: `${origin}/login` });
  }

  const isResearch = variant === "research";

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={
          isResearch
            ? "research-theme-switch research-allow-transform flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#B0B0B0] outline-none transition duration-180 ease-out hover:text-[#E4E4E4] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
            : "flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] outline-none transition hover:text-[#E4E4E4] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
        }
        aria-label="Open profile menu"
        aria-expanded={open}
      >
        <UserCircle className="h-6 w-6" />
      </button>

      <span
        aria-hidden="true"
        className={`absolute right-0 top-10 z-40 h-3 w-64 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
      />

      <div
        className={`absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-none border shadow-xl transition duration-200 ease-out ${
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0"
        } ${
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
            onClick={() => setOpen(false)}
            className={`research-profile-menu-item flex items-center gap-3 border-y border-transparent px-4 py-3 text-sm font-normal transition ${
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
          {showTeam ? (
            <Link
              href={teamHref}
              onClick={() => setOpen(false)}
              className={`research-profile-menu-item flex items-center gap-3 border-y border-transparent px-4 py-3 text-sm font-normal transition ${
                isResearch
                  ? "text-[#E4E4E4] hover:border-[#444444] hover:bg-[#383838] hover:text-[#A8DADC]"
                  : "text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <UsersRound
                className={`h-4 w-4 ${
                  isResearch ? "text-[#A8DADC]" : "text-slate-400"
                }`}
              />
              {teamLabel}
            </Link>
          ) : null}
          {showCalendar ? (
            <Link
              href={calendarHref}
              onClick={() => setOpen(false)}
              className={`research-profile-menu-item flex items-center gap-3 border-y border-transparent px-4 py-3 text-sm font-normal transition ${
                isResearch
                  ? "text-[#E4E4E4] hover:border-[#444444] hover:bg-[#383838] hover:text-[#A8DADC]"
                  : "text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <CalendarDays
                className={`h-4 w-4 ${
                  isResearch ? "text-[#A8DADC]" : "text-slate-400"
                }`}
              />
              Calendar
            </Link>
          ) : null}
          {showAdminConsole ? (
            <Link
              href={adminHref}
              onClick={() => setOpen(false)}
              className={`research-profile-menu-item flex items-center gap-3 border-y border-transparent px-4 py-3 text-sm font-normal transition ${
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
          ) : null}
          <button
            type="button"
            onClick={signOutToCurrentLogin}
            className={`research-profile-menu-item flex w-full items-center gap-3 border-y border-transparent px-4 py-3 text-left text-sm font-normal transition ${
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
