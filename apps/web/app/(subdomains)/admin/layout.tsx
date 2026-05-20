import Link from "next/link";
import { Users, Settings, Globe, AlertTriangle } from "lucide-react";
import { SignOutButton } from "../../../components/SignOutButton";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { auth } from "../../../auth";
import { redirect } from "next/navigation";

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
    <div className="min-h-screen bg-white dark:bg-slate-950 flex transition-colors duration-200">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transition-colors duration-200">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
            Admin Panel
          </span>
        </div>
        
        <nav className="flex-1 p-4 space-y-8 overflow-y-auto">
          
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Core Management
            </div>
            <div className="space-y-1">
              <Link href="/users" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Users className="w-5 h-5 text-slate-500" />
                <span className="font-medium">Users & Roles</span>
              </Link>
              <Link href="/portfolio" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Globe className="w-5 h-5 text-slate-500" />
                <span className="font-medium">Main Portfolio</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              Domain Control
            </div>
            <div className="space-y-1">
              <Link href="/learn-settings" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Settings className="w-5 h-5 text-slate-500" />
                <span className="font-medium">Learn Platform</span>
              </Link>
              <Link href="/research-settings" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Settings className="w-5 h-5 text-slate-500" />
                <span className="font-medium">Research Hub</span>
              </Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">
              System Previews
            </div>
            <div className="space-y-1">
              <a href="https://tamph.com/401" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Preview 401 Page</span>
              </a>
              <a href="https://tamph.com/not-found-test" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Preview 404 Page</span>
              </a>
            </div>
          </div>

        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 transition-colors duration-200">
          <h2 className="text-slate-800 dark:text-slate-300 font-medium">Control Center</h2>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <span className="text-slate-600 dark:text-slate-400 text-sm hidden sm:inline-block">
              Logged in as <strong className="text-slate-900 dark:text-white">{session.user.email}</strong>
            </span>
            <SignOutButton />
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
