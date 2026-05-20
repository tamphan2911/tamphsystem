import Link from "next/link";
import { SignOutButton } from "../../../components/SignOutButton";
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
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Admin Panel
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link
            href="/"
            className="flex items-center px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/users"
            className="flex items-center px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            Users
          </Link>
          <Link
            href="/settings"
            className="flex items-center px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            Settings
          </Link>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* Top Navbar */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8">
          <h2 className="text-slate-300 font-medium">Control Center</h2>
          <div className="flex items-center space-x-6">
            <span className="text-slate-400 text-sm">
              Logged in as <strong className="text-white">{session.user.email}</strong>
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
