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
  const baseClass =
    "group/navlink relative flex items-center gap-3 overflow-visible rounded-none border-y border-transparent px-5 py-3 text-sm font-normal capitalize outline-none transition-[background-color,color,border-color] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-[#A8DADC]/45 motion-reduce:transition-none";
  const stateClass = isActive
    ? "border-[#444444] bg-[#383838] text-[#E4E4E4]"
    : adminOnly
      ? "text-[#B0B0B0] hover:border-[#444444] hover:bg-[#383838] hover:text-[#FFC1CC]"
      : "text-[#B0B0B0] hover:border-[#444444] hover:bg-[#383838] hover:text-[#A8DADC]";
  const iconClass = isActive
    ? "text-[#A8DADC]"
    : adminOnly
      ? "text-[#FFC1CC] transition-colors group-hover/navlink:text-[#FFC1CC]"
      : "text-[#A8DADC] transition-colors group-hover/navlink:text-[#A8DADC]";

  return (
    <Link
      href={href}
      aria-label={collapsed ? label : undefined}
      className={`${baseClass} ${stateClass} ${
        collapsed ? "justify-center" : ""
      }`}
    >
      <span
        className={`absolute left-0 top-0 h-full w-1 transition-opacity duration-150 ${
          isActive ? "bg-[#B39CD0] opacity-100" : "opacity-0"
        }`}
      />
      {collapsed && <Icon className={`h-5 w-5 flex-none ${iconClass}`} />}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
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
        <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 z-50 -translate-y-1/2 -translate-x-1 whitespace-nowrap border border-[#444444] bg-[#2C2C2C] px-3 py-2 text-xs font-normal capitalize text-[#E4E4E4] opacity-0 shadow-xl shadow-black/30 transition duration-200 ease-out group-hover/navlink:translate-x-0 group-hover/navlink:opacity-100 group-focus-visible/navlink:translate-x-0 group-focus-visible/navlink:opacity-100 motion-reduce:transition-none">
          {label}
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
