"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
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
import { ScrollToTopButton } from "./components/ScrollToTopButton";

const navItems = [
  { href: "/projects", label: "Research", icon: "projects" as const },
  {
    href: "/organized-projects",
    label: "Projects",
    icon: "organizedProjects" as const,
  },
  {
    href: "/funding-institutions",
    label: "Funder",
    icon: "fundingInstitutions" as const,
    adminOnly: true,
  },
  {
    href: "/proposals",
    label: "Proposals",
    icon: "proposals" as const,
    adminOnly: true,
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: "tasks" as const,
    requiresTaskAccess: true,
  },
  {
    href: "/submissions",
    label: "Submissions",
    icon: "submissions" as const,
    adminOnly: true,
  },
  {
    href: "/suggestions",
    label: "Suggestions",
    icon: "suggestions" as const,
    adminOnly: true,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "notifications" as const,
    adminOnly: true,
  },
  { href: "/journals", label: "Journals", icon: "journals" as const },
  { href: "/conferences", label: "Conferences", icon: "conferences" as const },
  {
    href: "/reviews",
    label: "Reviews",
    icon: "reviews" as const,
    requiresReviewAccess: true,
  },
  {
    href: "/accounts",
    label: "Accounts",
    icon: "accounts" as const,
    requiresAccountAccess: true,
  },
  {
    href: "/assistants",
    label: "Assistants",
    icon: "assistants" as const,
    adminOnly: true,
  },
  {
    href: "/users",
    label: "Users",
    icon: "users" as const,
    adminOnly: true,
  },
];

const hubLinks = [
  { href: "/portfolio", label: "Portfolio", icon: BriefcaseBusiness },
  { href: "/learn", label: "Learn", icon: GraduationCap },
  {
    href: "https://admin.tamph.com",
    label: "Admin",
    icon: SlidersHorizontal,
    adminOnly: true,
  },
];

const sidebarStateKey = "research-sidebar-collapsed";

function closeResearchModal(overlay: HTMLElement) {
  const closeButton = overlay.querySelector<HTMLButtonElement>(
    'button[aria-label="Close"], button[aria-label="Close modal"]',
  );
  if (closeButton) {
    closeButton.click();
    return;
  }

  const cancelButton = Array.from(
    overlay.querySelectorAll<HTMLButtonElement>("button"),
  ).find((button) => button.textContent?.trim().toLowerCase() === "cancel");
  cancelButton?.click();
}

function isResearchModalOverlay(element: HTMLElement) {
  return (
    element.classList.contains("fixed") &&
    element.classList.contains("inset-0") &&
    element.className.includes("bg-slate-950")
  );
}

export function ResearchShell({
  children,
  email,
  name,
  isAdmin,
  isAssistant,
  canSeeTasks,
  canSeeAccounts,
  canSeeReviews,
  unopenedProposalCount,
}: {
  children: React.ReactNode;
  email?: string | null;
  name?: string | null;
  isAdmin: boolean;
  isAssistant: boolean;
  canSeeTasks: boolean;
  canSeeAccounts: boolean;
  canSeeReviews: boolean;
  unopenedProposalCount: number;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(sidebarStateKey) === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(sidebarStateKey, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    function visibleModalOverlays() {
      return Array.from(
        document.querySelectorAll<HTMLElement>(".fixed.inset-0"),
      )
        .filter(isResearchModalOverlay)
        .sort((a, b) => {
          const zA =
            Number.parseInt(window.getComputedStyle(a).zIndex, 10) || 0;
          const zB =
            Number.parseInt(window.getComputedStyle(b).zIndex, 10) || 0;
          return zB - zA;
        });
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      const overlay = visibleModalOverlays()[0];
      if (!overlay) return;
      closeResearchModal(overlay);
    }

    function closeOnBackdrop(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!isResearchModalOverlay(target)) return;
      closeResearchModal(target);
    }

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("mousedown", closeOnBackdrop);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("mousedown", closeOnBackdrop);
    };
  }, []);

  const visibleNavItems = navItems.filter((item) => {
    if ("adminOnly" in item && item.adminOnly) return isAdmin;
    if ("requiresTaskAccess" in item && item.requiresTaskAccess)
      return canSeeTasks || isAssistant;
    if ("requiresReviewAccess" in item && item.requiresReviewAccess)
      return canSeeReviews;
    if ("requiresAccountAccess" in item && item.requiresAccountAccess)
      return canSeeAccounts;
    return true;
  });

  return (
    <ResearchToastProvider>
      <div className="research-site-root relative min-h-screen overflow-x-hidden bg-[#f6f4ef] text-[#201c25] dark:bg-[#090611] dark:text-white">
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#ded8cf] bg-[#fbfaf7]/90 shadow-[10px_0_34px_rgba(32,28,37,0.07)] backdrop-blur-xl transition-[width] duration-300 ease-out lg:flex lg:flex-col motion-reduce:transition-none dark:border-[#2f2938] dark:bg-[#111019]/90 dark:shadow-black/35 ${
            collapsed ? "w-20" : "w-72"
          }`}
        >
          <div
            className={`flex h-20 items-center border-b border-[#ded8cf] px-4 transition-all duration-300 motion-reduce:transition-none dark:border-[#332c3d] ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <div
              className={`flex h-11 w-11 flex-none items-center justify-center transition-all duration-300 motion-reduce:transition-none ${
                collapsed ? "w-0 scale-75 opacity-0" : "opacity-100"
              }`}
            >
              <Image
                src="/research-logo.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg object-cover shadow-sm ring-1 ring-[#d6cfc4] dark:ring-[#51495d]"
              />
            </div>
            <div
              className={`min-w-0 overflow-hidden transition-all duration-300 motion-reduce:transition-none ${collapsed ? "w-0 opacity-0" : "w-44 opacity-100"}`}
            >
              <Link
                href="/"
                className="block truncate text-lg font-black text-[#17131d] transition hover:text-[#ff6d3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a3d]/45 dark:text-white dark:hover:text-[#ffb38a]"
              >
                Research Hub
              </Link>
              <p className="truncate text-xs text-[#786f7f] dark:text-[#aaa4b5]">
                Pipeline and journal control
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg border border-[#d6cfc4] bg-[#f1eee8] text-[#655d6d] shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:border-[#ffb38a] hover:bg-white hover:text-[#17131d] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a3d]/45 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-[#51495d] dark:bg-[#1b1724] dark:text-[#d7d1df] dark:shadow-none dark:hover:border-[#ff8a3d]/55 dark:hover:bg-[#282231] dark:hover:text-[#ffb38a] ${
                collapsed ? "absolute right-2 top-6" : "ml-auto"
              }`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav
            className={`flex-1 space-y-1.5 transition-all duration-300 motion-reduce:transition-none ${collapsed ? "overflow-visible p-3" : "overflow-y-auto p-3.5"}`}
          >
            {visibleNavItems.map((item) => (
              <ActiveNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                collapsed={collapsed}
                adminOnly={"adminOnly" in item && item.adminOnly}
                badgeCount={
                  item.href === "/proposals" ? unopenedProposalCount : 0
                }
              />
            ))}
          </nav>
          {!isAdmin && <SidebarSupportCard collapsed={collapsed} />}
        </aside>

        <div
          className={`relative z-10 transition-[padding] duration-300 ease-out ${collapsed ? "lg:pl-20" : "lg:pl-72"}`}
        >
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#ded8cf] bg-[#fbfaf7]/82 px-4 backdrop-blur-xl dark:border-[#332c3d] dark:bg-[#111019]/82 sm:px-8">
            <div className="flex min-w-0 items-center gap-2 overflow-x-auto lg:hidden">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold transition ${
                    "adminOnly" in item && item.adminOnly
                      ? "bg-[#fff1e9] text-[#9f3f16] ring-1 ring-[#ffd7c2] hover:bg-[#ffe6d8] dark:bg-[#2a1812] dark:text-[#ffb38a] dark:ring-[#7a3c25] dark:hover:bg-[#3a2119]"
                      : "text-[#655d6d] hover:bg-[#ece7df] dark:text-[#d7d1df] dark:hover:bg-[#211c2d]"
                  }`}
                >
                  {item.label}
                  {item.href === "/proposals" && unopenedProposalCount > 0 && (
                    <span className="ml-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {unopenedProposalCount > 99
                        ? "99+"
                        : unopenedProposalCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <div className="flex items-center gap-1 rounded-lg border border-[#d6cfc4] bg-[#f1eee8] p-1 shadow-sm dark:border-[#403849] dark:bg-[#211c2d]">
                {hubLinks
                  .filter((item) => !("adminOnly" in item) || isAdmin)
                  .map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold text-[#655d6d] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:text-[#17131d] hover:shadow-sm motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:text-[#d7d1df] dark:hover:bg-[#312c3b] dark:hover:text-[#ffb38a]"
                    >
                      <item.icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ResearchNotificationBell enabled={Boolean(email)} />
              <ThemeToggle />
              <ProfileMenu
                email={email}
                name={name}
                profileHref="/profile"
                adminHref="https://admin.tamph.com"
              />
            </div>
          </header>

          <main className="min-h-[calc(100vh-5rem)] p-4 transition-[padding] duration-300 sm:p-8">
            {children}
          </main>
        </div>
        <ScrollToTopButton />
      </div>
    </ResearchToastProvider>
  );
}
