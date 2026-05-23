import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ExternalLink,
  FolderGit2,
  Globe,
  GraduationCap,
  KeyRound,
  Library,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { ProfileMenu } from "../../../components/ProfileMenu";
import { SidebarSupportCard } from "../../../components/SidebarSupportCard";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Control",
    items: [
      { href: "/", label: "Overview", icon: BarChart3 },
      { href: "/users", label: "Users & Roles", icon: Users },
    ],
  },
  {
    label: "Domains",
    items: [
      { href: "/courses", label: "Learn Courses", icon: GraduationCap },
      { href: "/research", label: "Research Projects", icon: FolderGit2 },
      { href: "/journals", label: "Journals", icon: BookOpen },
      { href: "/accounts", label: "Publisher Accounts", icon: KeyRound },
    ],
  },
  {
    label: "Preview",
    items: [
      { href: "https://tamph.com", label: "Portfolio", icon: Globe, external: true },
      { href: "https://learn.tamph.com", label: "Learn", icon: Library, external: true },
      { href: "https://research.tamph.com", label: "Research", icon: ShieldCheck, external: true },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900">
        <div className="flex h-20 items-center gap-3 border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-bold">Admin Control</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage every domain</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-7">
              <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const className = "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";
                  if (item.external) {
                    return (
                      <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={className}>
                        <Icon className="h-5 w-5 text-slate-400" />
                        <span className="flex-1">{item.label}</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </a>
                    );
                  }
                  return (
                    <Link key={item.href} href={item.href} className={className}>
                      <Icon className="h-5 w-5 text-slate-400" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <SidebarSupportCard />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/85 sm:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
              {session.user.email}
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">Central administration for portfolio, LMS, and research</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileMenu
              email={session.user.email}
              name={session.user.name}
              profileHref="/users"
              adminHref="/"
            />
          </div>
        </header>

        <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
