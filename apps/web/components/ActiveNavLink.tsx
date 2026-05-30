"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  Inbox,
  FolderGit2,
  KeyRound,
  Landmark,
  ShieldCheck,
  UsersRound,
} from "lucide-react";

const icons = {
  projects: FolderGit2,
  journals: BookOpen,
  accounts: KeyRound,
  assistants: ShieldCheck,
  reviews: ClipboardCheck,
  submissions: FileCheck2,
  tasks: ClipboardList,
  conferences: CalendarDays,
  organizedProjects: Building2,
  fundingInstitutions: Landmark,
  proposals: Inbox,
  users: UsersRound,
};

export function ActiveNavLink({
  href,
  label,
  icon,
  collapsed = false,
  adminOnly = false,
}: {
  href: string;
  label: string;
  icon: keyof typeof icons;
  collapsed?: boolean;
  adminOnly?: boolean;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  const Icon = icons[icon];

  return (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      className={`group/navlink relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        collapsed ? "justify-center" : ""
      } ${
        isActive
          ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-400/20"
          : adminOnly
            ? "bg-violet-50/70 text-violet-800 ring-1 ring-violet-100 hover:bg-violet-100/80 hover:text-violet-950 dark:bg-violet-950/25 dark:text-violet-200 dark:ring-violet-800/50 dark:hover:bg-violet-900/35 dark:hover:text-violet-100"
            : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-emerald-100"
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition ${isActive ? "bg-emerald-600 opacity-100 dark:bg-emerald-300" : "opacity-0"}`}
      />
      <Icon
        className={`h-5 w-5 ${
          isActive
            ? "text-emerald-600 dark:text-emerald-200"
            : adminOnly
              ? "text-violet-500 dark:text-violet-300"
              : "text-slate-400 dark:text-slate-300"
        }`}
      />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-y-1/2 -translate-x-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 opacity-0 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.03] transition duration-200 ease-out group-hover/navlink:translate-x-0 group-hover/navlink:opacity-100 group-focus-visible/navlink:translate-x-0 group-focus-visible/navlink:opacity-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:shadow-black/30 dark:ring-white/[0.04]">
          {label}
          <span className="absolute right-full top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rotate-45 border-b border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
        </span>
      )}
    </Link>
  );
}
