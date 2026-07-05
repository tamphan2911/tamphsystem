"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import {
  BookOpen,
  Building2,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileArchive,
  Factory,
  Inbox,
  FolderGit2,
  KeyRound,
  Landmark,
  Lightbulb,
  NotebookText,
  Route,
  ShieldCheck,
  UserRoundSearch,
  Users,
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
  taskGuides: NotebookText,
  workflowGuides: Route,
  suggestedReviewers: UserRoundSearch,
  taskReports: FileArchive,
  conferences: CalendarDays,
  organizedProjects: Building2,
  fundingInstitutions: Landmark,
  publishers: Factory,
  proposals: Inbox,
  suggestions: Lightbulb,
  notifications: BellRing,
  teams: Users,
  users: UsersRound,
};

export function ActiveNavLink({
  href,
  label,
  icon,
  collapsed = false,
  adminOnly = false,
  badgeCount = 0,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: keyof typeof icons;
  collapsed?: boolean;
  adminOnly?: boolean;
  badgeCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [tooltipTop, setTooltipTop] = useState<number | null>(null);
  const isActive =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  const Icon = icons[icon];
  const displayLabel = label.toUpperCase();
  const baseClass =
    "research-sidebar-link group/navlink relative flex items-center gap-3 overflow-visible rounded-none border-y border-transparent px-5 py-3 text-sm font-normal outline-none transition-[background-color,color,border-color,box-shadow] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[#A8DADC]/45 motion-reduce:transition-none";
  const stateClass = isActive
    ? "research-sidebar-link-active"
    : adminOnly
      ? "research-sidebar-link-idle research-sidebar-link-admin"
      : "research-sidebar-link-idle";
  const updateTooltipPosition = useCallback(
    (target: HTMLElement) => {
      if (!collapsed) return;
      const rect = target.getBoundingClientRect();
      setTooltipTop(rect.top + rect.height / 2);
    },
    [collapsed],
  );
  const tooltipVisible = collapsed && tooltipTop !== null;

  return (
    <Link
      href={href}
      data-active={isActive ? "true" : "false"}
      data-collapsed={collapsed ? "true" : "false"}
      aria-label={collapsed ? displayLabel : undefined}
      onClick={onNavigate}
      onMouseEnter={(event) => updateTooltipPosition(event.currentTarget)}
      onMouseLeave={() => setTooltipTop(null)}
      onFocus={(event) => updateTooltipPosition(event.currentTarget)}
      onBlur={() => setTooltipTop(null)}
      className={`${baseClass} ${stateClass} ${
        collapsed ? "w-full justify-center px-0" : ""
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
      {!collapsed && adminOnly && (
        <span
          title="Admin only"
          className="ml-auto inline-flex h-5 w-5 flex-none items-center justify-center text-[#FFC1CC] transition-[color,transform] duration-200 ease-out group-hover/navlink:scale-110 group-hover/navlink:text-[#F0A6B5] dark:text-[#F0A6B5] dark:group-hover/navlink:text-[#FFC1CC]"
        >
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span className="sr-only">Admin only</span>
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
      {tooltipVisible && (
        <span
          className="pointer-events-none fixed left-[5.75rem] z-[9999] max-w-[calc(100vw-6.5rem)] -translate-y-1/2 translate-x-0 whitespace-nowrap border border-[#D8D0C2] bg-white px-3 py-2 text-xs font-normal text-slate-700 opacity-100 shadow-xl shadow-slate-900/12 transition duration-200 ease-out dark:border-[#444444] dark:bg-[#2C2C2C] dark:text-[#E4E4E4] dark:shadow-black/30 motion-reduce:transition-none"
          style={{ top: tooltipTop }}
        >
          {displayLabel}
          {adminOnly && (
            <span className="ml-2 border border-[#D8D0C2] px-1.5 py-0.5 text-[9px] font-normal uppercase tracking-wide text-rose-700 dark:border-[#444444] dark:text-[#FFC1CC]">
              Admin
            </span>
          )}
          {badgeCount > 0 && (
            <span className="ml-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
          <span className="absolute right-full top-1/2 h-2.5 w-2.5 -translate-y-1/2 translate-x-1/2 rotate-45 border-b border-l border-[#D8D0C2] bg-white dark:border-[#444444] dark:bg-[#2C2C2C]" />
        </span>
      )}
    </Link>
  );
}
