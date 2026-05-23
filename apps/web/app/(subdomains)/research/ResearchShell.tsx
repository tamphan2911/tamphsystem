"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
import { ActiveNavLink } from "../../../components/ActiveNavLink";
import { ProfileMenu } from "../../../components/ProfileMenu";
import { SidebarSupportCard } from "../../../components/SidebarSupportCard";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { ResearchNotificationBell } from "./ResearchNotificationBell";
import { ResearchToastProvider } from "./components/ResearchToast";

const navItems = [
  { href: "/projects", label: "Research", icon: "projects" as const },
  { href: "/tasks", label: "Tasks", icon: "tasks" as const, requiresTaskAccess: true },
  { href: "/journals", label: "Journals", icon: "journals" as const },
  { href: "/conferences", label: "Conferences", icon: "conferences" as const },
  { href: "/reviews", label: "Reviews", icon: "reviews" as const },
  { href: "/accounts", label: "Accounts", icon: "accounts" as const },
  { href: "/assistants", label: "Assistants", icon: "assistants" as const, adminOnly: true },
];

const adminLinks = [
  { href: "https://tamph.com", label: "Portfolio", icon: BriefcaseBusiness },
  { href: "https://learn.tamph.com", label: "Learn", icon: GraduationCap },
  { href: "https://admin.tamph.com", label: "Admin", icon: SlidersHorizontal },
];

export function ResearchShell({
  children,
  email,
  name,
  isAdmin,
  isAssistant,
}: {
  children: React.ReactNode;
  email?: string | null;
  name?: string | null;
  isAdmin: boolean;
  isAssistant: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleNavItems = navItems.filter((item) => {
    if ("adminOnly" in item && item.adminOnly) return isAdmin;
    if ("requiresTaskAccess" in item && item.requiresTaskAccess) return isAdmin || isAssistant;
    return true;
  });

  return (
    <ResearchToastProvider>
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-slate-200 bg-white transition-[width] duration-300 ease-out lg:flex lg:flex-col dark:border-slate-700 dark:bg-slate-900 ${
          collapsed ? "w-20" : "w-72"
        }`}
      >
        <div className={`flex h-20 items-center border-b border-slate-200 px-4 transition-all duration-300 dark:border-slate-800 ${collapsed ? "justify-center" : "gap-3"}`}>
          <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition-all duration-300 ${
            collapsed ? "w-0 scale-75 opacity-0" : "opacity-100"
          }`}>
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className={`min-w-0 overflow-hidden transition-all duration-300 ${collapsed ? "w-0 opacity-0" : "w-44 opacity-100"}`}>
            <p className="truncate text-lg font-bold text-slate-950 dark:text-white">Research Hub</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-300">Pipeline and journal control</p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:shadow-none dark:hover:border-emerald-400/30 dark:hover:bg-slate-700 dark:hover:text-emerald-100 ${
              collapsed ? "absolute right-2 top-6" : "ml-auto"
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto transition-all duration-300 ${collapsed ? "p-3" : "p-4"}`}>
          {visibleNavItems.map((item) => (
            <ActiveNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              collapsed={collapsed}
            />
          ))}
        </nav>
        <SidebarSupportCard collapsed={collapsed} />
      </aside>

      <div className={`transition-[padding] duration-300 ease-out ${collapsed ? "lg:pl-20" : "lg:pl-72"}`}>
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 sm:px-8">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto lg:hidden">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <span className="text-sm text-slate-500 dark:text-slate-400">Research operations</span>
            {isAdmin && (
              <div className="ml-3 flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/80">
                {adminLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-emerald-100"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ResearchNotificationBell enabled={isAdmin || isAssistant} />
            <ThemeToggle />
            <ProfileMenu
              email={email}
              name={name}
              profileHref="/profile"
              adminHref="https://admin.tamph.com"
            />
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] p-4 transition-[padding] duration-300 sm:p-8">{children}</main>
      </div>
    </div>
    </ResearchToastProvider>
  );
}
