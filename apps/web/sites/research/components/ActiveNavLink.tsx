"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  BellRing,
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
  notifications: BellRing,
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
  const displayLabel = label.toUpperCase();
  const baseClass =
    "research-sidebar-link group/navlink relative flex items-center gap-3 overflow-visible rounded-none border-y border-transparent px-5 py-3 text-sm font-normal outline-none transition-[background-color,color,border-color,box-shadow,transform] duration-200 ease-out active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/45 motion-reduce:transform-none motion-reduce:transition-none";
  const stateClass = isActive
    ? "research-sidebar-link-active"
    : adminOnly
      ? "research-sidebar-link-idle research-sidebar-link-admin"
      : "research-sidebar-link-idle";

  return (
    <Link
      href={href}
      data-active={isActive ? "true" : "false"}
      aria-label={collapsed ? displayLabel : undefined}
      className={`${baseClass} ${stateClass} ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-1 origin-center transition-[opacity,transform,background-color] duration-200 ease-out group-hover/navlink:scale-y-100 ${
          isActive
            ? "scale-y-100 bg-[#B39CD0] opacity-100"
            : "scale-y-50 bg-[#A8DADC] opacity-0 group-hover/navlink:opacity-70"
        }`}
      />
      <Icon
        className="h-4 w-4 flex-none text-current transition-[color,transform] duration-200 ease-out group-hover/navlink:translate-x-0.5 group-hover/navlink:scale-110 group-active/navlink:scale-95 motion-reduce:transform-none"
        strokeWidth={1.75}
      />
      {!collapsed && (
        <span className="min-w-0 flex-1 truncate transition-transform duration-200 ease-out group-hover/navlink:translate-x-0.5 group-active/navlink:translate-x-0 motion-reduce:transform-none">
          {displayLabel}
        </span>
      )}
      {!collapsed && adminOnly && !isActive && (
        <span className="border border-[#444444] px-1.5 py-0.5 text-[9px] font-normal uppercase tracking-wide text-[#FFC1CC]">
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
        <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-y-1/2 -translate-x-1 whitespace-nowrap border border-[#444444] bg-[#2C2C2C] px-3 py-2 text-xs font-normal text-[#E4E4E4] opacity-0 shadow-xl shadow-black/30 transition duration-200 ease-out group-hover/navlink:translate-x-0 group-hover/navlink:opacity-100 group-focus-visible/navlink:translate-x-0 group-focus-visible/navlink:opacity-100 motion-reduce:transition-none">
          {displayLabel}
          {adminOnly && (
            <span className="ml-2 border border-[#444444] px-1.5 py-0.5 text-[9px] font-normal uppercase tracking-wide text-[#FFC1CC]">
              Admin
            </span>
          )}
          {badgeCount > 0 && (
            <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
          <span className="absolute right-full top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rotate-45 border-b border-l border-[#444444] bg-[#2C2C2C]" />
        </span>
      )}
    </Link>
  );
}
