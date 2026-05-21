import Link from "next/link";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { BriefcaseBusiness, GraduationCap, SlidersHorizontal, BarChart3 } from "lucide-react";
import { ActiveNavLink } from "../../../components/ActiveNavLink";
import { ProfileMenu } from "../../../components/ProfileMenu";
import { auth } from "../../../auth";
import { Role } from "@repo/db";

const navItems = [
  { href: "/projects", label: "Research Pipeline", icon: "projects" as const },
  { href: "/journals", label: "Journals", icon: "journals" as const },
  { href: "/accounts", label: "Publisher Accounts", icon: "accounts" as const },
  { href: "/assistants", label: "Assistants", icon: "assistants" as const },
];

export default async function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ?? []) as Role[];
  const isAdmin = roles.includes(Role.ADMIN);
  const adminLinks = [
    { href: "https://tamph.com", label: "Portfolio", icon: BriefcaseBusiness },
    { href: "https://learn.tamph.com", label: "Learn", icon: GraduationCap },
    { href: "https://admin.tamph.com", label: "Admin", icon: SlidersHorizontal },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold">Research Hub</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Pipeline and journal control</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => (
            <ActiveNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
          ))}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 sm:px-8">
          <div className="flex min-w-0 items-center gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
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
              <div className="ml-3 flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
                {adminLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-sm"
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileMenu
              email={session?.user?.email}
              name={session?.user?.name}
              profileHref="/profile"
              adminHref="https://admin.tamph.com"
            />
          </div>
        </header>

        <main className="min-h-[calc(100vh-5rem)] p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
