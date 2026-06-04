"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, Search, UserCircle } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: GraduationCap },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export function LearnAuthHeader() {
  const [isLearnHost, setIsLearnHost] = useState(false);

  useEffect(() => {
    setIsLearnHost(window.location.host.startsWith("learn."));
  }, []);

  if (!isLearnHost) {
    return null;
  }

  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-700 text-white">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black">TamphSystem Learn</p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Courses and practice workspace
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/courses"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          aria-label="Search courses"
        >
          <Search className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}
