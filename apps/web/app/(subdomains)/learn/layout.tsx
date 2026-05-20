import Link from "next/link";
import { ThemeToggle } from "../../../components/ThemeToggle";

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col transition-colors duration-200">
      {/* Top Navigation */}
      <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl leading-none">T</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              TamphSystem
            </span>
          </Link>

          {/* Main Menu (Center) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/courses" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              Courses
            </Link>
            <Link href="/pathways" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              Pathways
            </Link>
            <Link href="/enterprise" className="text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition-colors">
              Enterprise
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link 
              href="/login" 
              className="hidden md:block text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-medium px-4 py-2 transition-colors"
            >
              Log in
            </Link>
            <Link 
              href="/register" 
              className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 text-white font-medium px-5 py-2.5 rounded-full transition-colors shadow-sm"
            >
              Sign up
            </Link>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
