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
  Lightbulb,
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
  suggestions: Lightbulb,
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
    "group/navlink relative flex items-center gap-3 overflow-visible rounded-lg px-3 py-2.5 text-sm font-semibold outline-none transition-[background-color,color,box-shadow,transform,border-color] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#ff8a3d]/45 motion-reduce:transition-none motion-reduce:hover:translate-y-0";
  const stateClass = isActive
    ? "border border-[#ffceb5] bg-[#fff1e9] text-[#9f3f16] shadow-sm shadow-[#9f3f16]/5 dark:border-[#ff8a3d]/35 dark:bg-[#2a1812] dark:text-[#ffb38a] dark:shadow-black/20"
    : adminOnly
      ? "border border-[#e6d7ff] bg-[#f6f0ff]/75 text-[#6f45a6] shadow-sm shadow-[#6f45a6]/[0.03] hover:-translate-y-0.5 hover:border-[#d8c1ff] hover:bg-[#efe4ff] hover:text-[#4f2f7a] hover:shadow-md dark:border-[#6d5c86]/45 dark:bg-[#211633]/35 dark:text-[#d8c7ff] dark:shadow-black/10 dark:hover:border-[#9f83d8]/55 dark:hover:bg-[#2a1c40] dark:hover:text-white"
      : "border border-transparent text-[#5f5968] hover:-translate-y-0.5 hover:border-[#ded8cf] hover:bg-[#ece7df]/80 hover:text-[#17131d] hover:shadow-sm dark:text-[#d7d1df] dark:hover:border-[#403849] dark:hover:bg-[#211c2d] dark:hover:text-white";
  const iconClass = isActive
    ? "text-[#ff6d3a] dark:text-[#ffb38a]"
    : adminOnly
      ? "text-[#8b61c6] dark:text-[#c5a7ff]"
      : "text-[#8b8392] transition-colors group-hover/navlink:text-[#5f5968] dark:text-[#8f8799] dark:group-hover/navlink:text-[#d7d1df]";

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
            ? "bg-[#ff6d3a] opacity-100 dark:bg-[#ffb38a]"
            : adminOnly
              ? "bg-[#9f83d8]/70 opacity-70 group-hover/navlink:h-7 dark:bg-[#c5a7ff]/60"
              : "opacity-0"
        }`}
      />
      <Icon className={`h-5 w-5 flex-none ${iconClass}`} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && adminOnly && !isActive && (
        <span className="rounded-full bg-white/75 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#8b61c6] ring-1 ring-[#e6d7ff] dark:bg-[#211633]/65 dark:text-[#d8c7ff] dark:ring-[#6d5c86]/45">
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
        <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-y-1/2 -translate-x-1 whitespace-nowrap rounded-lg border border-[#ded8cf] bg-white px-3 py-2 text-xs font-semibold text-[#5f5968] opacity-0 shadow-xl shadow-[#201c25]/10 ring-1 ring-[#201c25]/[0.03] transition duration-200 ease-out group-hover/navlink:translate-x-0 group-hover/navlink:opacity-100 group-focus-visible/navlink:translate-x-0 group-focus-visible/navlink:opacity-100 motion-reduce:transition-none dark:border-[#403849] dark:bg-[#14101d] dark:text-[#d7d1df] dark:shadow-black/30 dark:ring-white/[0.04]">
          {label}
          {adminOnly && (
            <span className="ml-2 rounded-full bg-[#f6f0ff] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-[#8b61c6] ring-1 ring-[#e6d7ff] dark:bg-[#211633] dark:text-[#d8c7ff] dark:ring-[#6d5c86]/50">
              Admin
            </span>
          )}
          {badgeCount > 0 && (
            <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
          <span className="absolute right-full top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rotate-45 border-b border-l border-[#ded8cf] bg-white dark:border-[#403849] dark:bg-[#14101d]" />
        </span>
      )}
    </Link>
  );
}
