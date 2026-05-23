import Link from "next/link";
import { BookOpen, GraduationCap, LayoutDashboard, UserCircle } from "lucide-react";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { ProfileMenu } from "../../../components/ProfileMenu";
import { SidebarSupportCard } from "../../../components/SidebarSupportCard";
import { auth } from "../../../auth";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black">TamphSystem Learn</p>
              <p className="hidden text-xs text-slate-500 sm:block">Courses and practice workspace</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
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
              />
            ) : (
              <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-60 flex-none md:block">
          <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col">
            <nav className="flex-1 space-y-1 overflow-y-auto pb-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <SidebarSupportCard />
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
