import Link from "next/link";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { SignOutButton } from "../../../components/SignOutButton";
import { BookOpen, FolderGit2, KeyRound, ShieldCheck, BarChart3 } from "lucide-react";

const navItems = [
  { href: "/projects", label: "Research Pipeline", icon: FolderGit2 },
  { href: "/journals", label: "Journals", icon: BookOpen },
  { href: "/accounts", label: "Publisher Accounts", icon: KeyRound },
  { href: "/assistants", label: "Assistants", icon: ShieldCheck },
];

export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Icon className="h-5 w-5 text-slate-400" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 sm:px-8">
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
          <div className="hidden text-sm text-slate-500 lg:block dark:text-slate-400">
            Research operations
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <SignOutButton />
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
