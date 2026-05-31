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
  badgeCount = 0,
}: {
  href: string;
  label: string;
  icon: keyof typeof icons;
  collapsed?: boolean;
  adminOnly?: boolean;
  badgeCount?: number;
}) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  const Icon = icons[icon];
  const baseClass =
    "group/navlink relative flex items-center gap-3 overflow-visible rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-emerald-300/70 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  const stateClass = isActive
    ? "border border-emerald-200/70 bg-emerald-50 text-emerald-800 shadow-sm shadow-emerald-900/5 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100 dark:shadow-black/20"
    : adminOnly
      ? "border border-violet-100/80 bg-violet-50/70 text-violet-800 shadow-sm shadow-violet-900/[0.03] hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-100/80 hover:text-violet-950 hover:shadow-md dark:border-violet-700/35 dark:bg-violet-950/25 dark:text-violet-200 dark:shadow-black/10 dark:hover:border-violet-500/45 dark:hover:bg-violet-900/35 dark:hover:text-violet-100"
      : "border border-transparent text-slate-700 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-slate-100/80 hover:text-slate-950 hover:shadow-sm dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800/75 dark:hover:text-white";
  const iconClass = isActive
    ? "text-emerald-600 dark:text-emerald-200"
    : adminOnly
      ? "text-violet-500 dark:text-violet-300"
      : "text-slate-400 transition-colors group-hover/navlink:text-slate-600 dark:text-slate-400 dark:group-hover/navlink:text-slate-200";

  return (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      className={`${baseClass} ${stateClass} ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-[height,opacity,background-color] duration-200 ease-out ${
          isActive
            ? "bg-emerald-600 opacity-100 dark:bg-emerald-300"
            : adminOnly
              ? "bg-violet-400/70 opacity-70 group-hover/navlink:h-7 dark:bg-violet-300/60"
              : "opacity-0"
        }`}
      />
      <Icon className={`h-5 w-5 flex-none ${iconClass}`} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && adminOnly && !isActive && (
        <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-500 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-700/40">
          Admin
        </span>
      )}
      {badgeCount > 0 && (
        <span
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black leading-none text-white ring-2 ring-white dark:ring-slate-900 ${
            collapsed ? "absolute -right-1 -top-1" : "ml-auto"
          }`}
        >
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-y-1/2 -translate-x-1 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 opacity-0 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/[0.03] transition duration-200 ease-out group-hover/navlink:translate-x-0 group-hover/navlink:opacity-100 group-focus-visible/navlink:translate-x-0 group-focus-visible/navlink:opacity-100 motion-reduce:transition-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:shadow-black/30 dark:ring-white/[0.04]">
          {label}
          {adminOnly && (
            <span className="ml-2 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-violet-600 ring-1 ring-violet-100 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-700/50">
              Admin
            </span>
          )}
          {badgeCount > 0 && (
            <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
          <span className="absolute right-full top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rotate-45 border-b border-l border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950" />
        </span>
      )}
    </Link>
  );
}
