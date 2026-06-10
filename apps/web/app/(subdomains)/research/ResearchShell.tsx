"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ActiveNavLink } from "@/sites/research/components/ActiveNavLink";
import { ProfileMenu } from "@/sites/shared/components/ProfileMenu";
import { SidebarSupportCard } from "@/sites/research/components/SidebarSupportCard";
import { ResearchNotificationBell } from "./ResearchNotificationBell";
import { ResearchToastProvider } from "@/sites/research/components/ResearchToast";
import { ScrollToTopButton } from "@/sites/research/components/ScrollToTopButton";

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

const sidebarStateKey = "research-sidebar-collapsed";

function titleCaseLabel(label: string) {
  return label
    .split(" ")
    .map((word) =>
      word
        ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`
        : word,
    )
    .join(" ");
}

function closeResearchModal(overlay: HTMLElement) {
  const closeButton = overlay.querySelector<HTMLButtonElement>(
    'button[aria-label^="Close"], button[aria-label="Close modal"]',
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
  if (element.dataset.researchModalOverlay === "true") return true;

  return (
    element.classList.contains("fixed") &&
    element.classList.contains("inset-0") &&
    (element.className.includes("bg-slate-950") ||
      element.className.includes("bg-black"))
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
    document.documentElement.classList.add("dark");
  }, []);

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

  useEffect(() => {
    function hasVisibleModalOverlay() {
      return Array.from(
        document.querySelectorAll<HTMLElement>(".fixed.inset-0"),
      ).some(isResearchModalOverlay);
    }

    function collapseForModal() {
      if (collapsed || !hasVisibleModalOverlay()) return;
      setCollapsed(true);
    }

    collapseForModal();
    const observer = new MutationObserver(collapseForModal);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-research-modal-overlay"],
    });

    return () => observer.disconnect();
  }, [collapsed]);

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
      <div className="research-site-root relative h-screen overflow-y-auto overflow-x-hidden bg-[#242424] text-[#E4E4E4]">
        <aside
          className={`fixed inset-y-0 left-0 z-40 hidden border-r border-[#3D3D3D] bg-[#2C2C2C] transition-[width] duration-300 ease-out lg:flex lg:flex-col motion-reduce:transition-none ${
            collapsed ? "w-20" : "w-72"
          }`}
        >
          <div
            className={`flex h-20 items-center border-b border-[#3A3A3A] bg-[#303030] px-4 transition-all duration-300 motion-reduce:transition-none ${collapsed ? "justify-center" : "gap-3"}`}
          >
            <div
              className={`min-w-0 overflow-hidden transition-all duration-300 motion-reduce:transition-none ${collapsed ? "w-0 opacity-0" : "w-44 opacity-100"}`}
            >
              <Link
                href="/"
                className="block truncate text-lg font-normal text-[#E4E4E4] capitalize transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8DADC]/45"
              >
                Research Hub
              </Link>
              <p className="truncate text-xs text-[#B0B0B0]">
                Pipeline and journal control
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className={`flex h-9 w-9 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[#B0B0B0] transition duration-150 ease-out hover:text-[#E4E4E4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8DADC]/45 motion-reduce:transition-none ${
                collapsed ? "" : "ml-auto"
              }`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
              ) : (
                <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
              )}
            </button>
          </div>

          <nav
            className={`flex-1 pt-0 transition-all duration-300 motion-reduce:transition-none ${collapsed ? "overflow-visible pb-3" : "overflow-hidden pb-3"}`}
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
          <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b border-[#444444] bg-[#242424]/92 px-4 backdrop-blur-xl sm:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:hidden">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-none px-2 py-1 text-xs font-semibold transition ${
                    "adminOnly" in item && item.adminOnly
                      ? "bg-[#fff1e9] text-[#9f3f16] ring-1 ring-[#ffd7c2] hover:bg-[#ffe6d8] dark:bg-[#2a1812] dark:text-[#ffb38a] dark:ring-[#7a3c25] dark:hover:bg-[#3a2119]"
                      : "text-[#655d6d] hover:bg-[#ece7df] dark:text-[#d7d1df] dark:hover:bg-[#211c2d]"
                  }`}
                >
                  {titleCaseLabel(item.label)}
                  {item.href === "/proposals" && unopenedProposalCount > 0 && (
                    <span className="ml-1 rounded-none bg-red-600 px-1.5 py-0.5 text-[10px] font-black text-white">
                      {unopenedProposalCount > 99
                        ? "99+"
                        : unopenedProposalCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
            <div
              id="research-page-header"
              className="hidden min-w-0 flex-1 items-center lg:flex"
            />
            <div className="flex items-center gap-3">
              <ResearchNotificationBell enabled={Boolean(email)} />
              <ProfileMenu
                email={email}
                name={name}
                profileHref="/profile"
                adminHref="https://admin.tamph.com"
                variant="research"
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
