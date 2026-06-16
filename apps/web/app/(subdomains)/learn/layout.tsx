import Link from "next/link";
import {
  BookOpen,
  BriefcaseBusiness,
  FolderGit2,
  GraduationCap,
  LayoutDashboard,
  SlidersHorizontal,
  UserCircle,
} from "lucide-react";
import { ThemeToggle } from "@/sites/shared/components/ThemeToggle";
import { ProfileMenu } from "@/sites/shared/components/ProfileMenu";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { Role } from "@repo/db";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

const hubLinks = [
  { href: "https://tamph.com", label: "Portfolio", icon: BriefcaseBusiness },
  { href: "https://research.tamph.com", label: "Research", icon: FolderGit2 },
  { href: "https://admin.tamph.com", label: "Admin", icon: SlidersHorizontal },
];

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const sitePathname = (await headers()).get("x-site-pathname") ?? "";
  const isHomepage = sitePathname === "/";
  const isPublicCourseRoute =
    sitePathname === "/courses" || /^\/courses\/[^/]+$/.test(sitePathname);

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeSites: true },
    });
    if (
      !user?.activeSites.includes("learn") &&
      sitePathname !== "/activate" &&
      !isHomepage &&
      !isPublicCourseRoute
    ) {
      redirect("/activate");
    }
  }

  if (isHomepage) {
    return <div className="learn-site-root">{children}</div>;
  }

  return (
    <div className="learn-site-root min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black">TamphSystem Learn</p>
              <p className="hidden text-xs text-slate-500 sm:block">
                Courses and practice workspace
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/80 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {session?.user ? (
              <ProfileMenu
                email={session.user.email}
                name={session.user.name}
                profileHref="/profile"
                adminHref="https://admin.tamph.com"
                showAdminConsole={roles.includes(Role.ADMIN)}
              />
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1360px] gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-60 flex-none md:block">
          <nav className="sticky top-24 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-700 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </Link>
              );
            })}
            <div className="my-4 border-t border-slate-200 dark:border-slate-800" />
            {hubLinks.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold text-slate-600 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-slate-950 hover:shadow-sm dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
                >
                  <Icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </a>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
