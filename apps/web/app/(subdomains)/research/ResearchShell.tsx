"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Menu, Moon, Sun, X } from "lucide-react";
import { ActiveNavLink } from "@/sites/research/components/ActiveNavLink";
import { ProfileMenu } from "@/sites/shared/components/ProfileMenu";
import { SidebarSupportCard } from "@/sites/research/components/SidebarSupportCard";
import { ResearchNotificationBell } from "./ResearchNotificationBell";
import { ResearchToastProvider } from "@/sites/research/components/ResearchToast";
import { ScrollToTopButton } from "@/sites/research/components/ScrollToTopButton";
import { ResearchMobileTableEnhancer } from "@/sites/research/components/ResearchMobileTableEnhancer";
import { researchHour } from "@/sites/research/lib/date-time";

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
    rootAdminOnly: true,
  },
  {
    href: "/proposals",
    label: "Proposals",
    icon: "proposals" as const,
    rootAdminOnly: true,
  },
  {
    href: "/tasks",
    label: "Tasks",
    icon: "tasks" as const,
    requiresTaskAccess: true,
  },
  {
    href: "/task-reports",
    label: "Task reports",
    icon: "taskReports" as const,
    rootAdminOnly: true,
  },
  {
    href: "/submissions",
    label: "Submissions",
    icon: "submissions" as const,
    rootAdminOnly: true,
  },
  {
    href: "/suggestions",
    label: "Suggested Venues",
    icon: "suggestions" as const,
    rootAdminOnly: true,
  },
  {
    href: "/notifications",
    label: "Notifications",
    icon: "notifications" as const,
    rootAdminOnly: true,
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
    rootAdminOnly: true,
  },
  {
    href: "/users",
    label: "Users",
    icon: "users" as const,
    rootAdminOnly: true,
  },
];

const sidebarStateKey = "research-sidebar-collapsed";
const researchThemeKey = "research-theme-mode";
const researchThemePreferenceKey = "research-theme-preference";
const researchThemeTransitionMs = 280;
type ResearchTheme = "dark" | "light";

let researchThemeTransitionTimer: number | undefined;

function timeBasedResearchTheme(date = new Date()): ResearchTheme {
  const hour = researchHour(date);
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

function initialResearchTheme(): ResearchTheme {
  const preference = window.localStorage.getItem(researchThemePreferenceKey);
  if (preference === "light" || preference === "dark") return preference;
  return timeBasedResearchTheme();
}

function applyResearchTheme(theme: ResearchTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.dataset.researchTheme = theme;
  window.localStorage.setItem(researchThemeKey, theme);
  window.localStorage.setItem("theme", theme);
}

function startResearchThemeTransition() {
  const root = document.documentElement;
  root.classList.add("research-theme-transitioning");

  if (researchThemeTransitionTimer) {
    window.clearTimeout(researchThemeTransitionTimer);
  }

  researchThemeTransitionTimer = window.setTimeout(() => {
    root.classList.remove("research-theme-transitioning");
  }, researchThemeTransitionMs);
}

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

function ResearchThemeSwitch({
  theme,
  onChange,
}: {
  theme: ResearchTheme;
  onChange: (theme: ResearchTheme) => void;
}) {
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={() => onChange(isLight ? "dark" : "light")}
      className="research-theme-switch research-allow-transform group inline-flex h-10 w-10 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[#B0B0B0] outline-none transition duration-180 ease-out hover:text-[#E4E4E4] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Switch to dark theme" : "Switch to light theme"}
      aria-pressed={isLight}
    >
      {isLight ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}

export function ResearchShell({
  children,
  email,
  name,
  isAdmin,
  isRootAdmin,
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
  isRootAdmin: boolean;
  isAssistant: boolean;
  canSeeTasks: boolean;
  canSeeAccounts: boolean;
  canSeeReviews: boolean;
  unopenedProposalCount: number;
}) {
  const pathname = usePathname();
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(sidebarStateKey) === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<ResearchTheme>(() => {
    if (typeof window === "undefined") return "dark";
    return initialResearchTheme();
  });

  function handleThemeChange(nextTheme: ResearchTheme) {
    if (nextTheme === theme) return;
    startResearchThemeTransition();
    window.localStorage.setItem(researchThemePreferenceKey, nextTheme);
    setTheme(nextTheme);
  }

  useLayoutEffect(() => {
    applyResearchTheme(theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(sidebarStateKey, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    function closeMobileMenu(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (mobileMenuRef.current?.contains(target)) return;
      setMobileMenuOpen(false);
    }

    function closeMobileMenuOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileMenuOpen(false);
    }

    document.addEventListener("mousedown", closeMobileMenu);
    document.addEventListener("keydown", closeMobileMenuOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMobileMenu);
      document.removeEventListener("keydown", closeMobileMenuOnEscape);
    };
  }, [mobileMenuOpen]);

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
    if ("rootAdminOnly" in item && item.rootAdminOnly) return isRootAdmin;
    if ("adminOnly" in item && item.adminOnly) return isAdmin;
    if ("requiresTaskAccess" in item && item.requiresTaskAccess)
      return canSeeTasks || isAssistant;
    if ("requiresReviewAccess" in item && item.requiresReviewAccess)
      return canSeeReviews;
    if ("requiresAccountAccess" in item && item.requiresAccountAccess)
      return canSeeAccounts;
    return true;
  });
  const currentNavItem =
    visibleNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    ) ?? visibleNavItems[0];

  return (
    <ResearchToastProvider>
      <div
        className={`research-site-root relative h-screen overflow-y-auto overflow-x-hidden bg-[#242424] text-[#E4E4E4] ${
          theme === "light" ? "research-theme-light" : "research-theme-dark"
        }`}
      >
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
                Meth lab
              </Link>
              <p className="truncate text-xs text-[#B0B0B0]">
                Tam Phan, the cook!
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
                adminOnly={Boolean("adminOnly" in item && item.adminOnly)}
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
          <header className="sticky top-0 z-30 flex h-20 items-center border-b border-[#444444] bg-[#242424]/92 px-4 backdrop-blur-xl sm:px-8">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-3">
              <div
                ref={mobileMenuRef}
                className="relative flex min-w-0 flex-1 lg:hidden"
              >
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((value) => !value)}
                  className="research-mobile-menu-trigger research-allow-transform inline-flex h-10 max-w-full cursor-pointer items-center gap-2 border border-[#444444] bg-[#2C2C2C] px-3 text-sm font-normal text-[#E4E4E4] outline-none transition-[background-color,border-color,color,transform] duration-180 ease-out hover:-translate-y-0.5 hover:border-[#586464] hover:bg-[#333a3a] focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35 active:translate-y-0 active:scale-[0.98]"
                  aria-expanded={mobileMenuOpen}
                  aria-controls="research-mobile-menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-4 w-4 flex-none" strokeWidth={1.75} />
                  ) : (
                    <Menu className="h-4 w-4 flex-none" strokeWidth={1.75} />
                  )}
                  <span className="min-w-0 truncate">
                    {titleCaseLabel(currentNavItem?.label ?? "Research")}
                  </span>
                </button>

                {mobileMenuOpen && (
                  <div
                    id="research-mobile-menu"
                    className="research-mobile-menu-panel absolute left-0 top-[calc(100%+0.75rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden border border-[#444444] bg-[#2C2C2C] shadow-2xl shadow-black/35 animate-[modalPanelIn_160ms_ease-out]"
                  >
                    <div className="border-b border-[#444444] px-4 py-3">
                      <p className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
                        Navigation
                      </p>
                    </div>
                    <nav className="max-h-[min(70vh,34rem)] overflow-y-auto py-1">
                      {visibleNavItems.map((item) => (
                        <ActiveNavLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          icon={item.icon}
                          adminOnly={Boolean(
                            "adminOnly" in item && item.adminOnly,
                          )}
                          badgeCount={
                            item.href === "/proposals"
                              ? unopenedProposalCount
                              : 0
                          }
                          onNavigate={() => setMobileMenuOpen(false)}
                        />
                      ))}
                    </nav>
                  </div>
                )}
              </div>
              <div
                id="research-page-header"
                className="hidden min-w-0 flex-1 items-center lg:flex"
              />
              <div className="flex items-center gap-3">
                <ResearchThemeSwitch
                  theme={theme}
                  onChange={handleThemeChange}
                />
                <ResearchNotificationBell enabled={Boolean(email)} />
                <ProfileMenu
                  email={email}
                  name={name}
                  profileHref="/profile"
                  adminHref="https://admin.tamph.com"
                  showAdminConsole={isRootAdmin}
                  variant="research"
                />
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-5rem)] min-w-0 overflow-x-hidden p-4 transition-[padding] duration-300 sm:p-8 lg:overflow-x-visible">
            <div
              id="research-page-mobile-header"
              className="mb-4 min-w-0 empty:hidden lg:hidden"
            />
            {children}
          </main>
        </div>
        <ScrollToTopButton />
        <ResearchMobileTableEnhancer />
      </div>
    </ResearchToastProvider>
  );
}
