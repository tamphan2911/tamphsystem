"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export function ActiveNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
        isActive
          ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100"
          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
      }`}
    >
      <span className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition ${isActive ? "bg-emerald-600 opacity-100" : "opacity-0"}`} />
      <Icon className={`h-5 w-5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
      {label}
    </Link>
  );
}
