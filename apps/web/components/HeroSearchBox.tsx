"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";

export function HeroSearchBox({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/courses?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (variant === "dark") {
    return (
      <form onSubmit={handleSearch} className="relative w-full">
        <div className="group relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 sm:pl-6">
            <Search className="h-5 w-5 text-[#bdb7c7] transition-colors duration-300 group-focus-within:text-[#ff8a3d]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, skills, or topics"
            className="block h-16 w-full rounded-lg border border-[#4d4659] bg-[#100b19]/95 py-4 pl-12 pr-16 text-base text-white shadow-2xl shadow-black/35 outline-none transition-all duration-300 placeholder:text-[#7f778c] focus:border-[#ff8a3d] focus:ring-4 focus:ring-[#ff8a3d]/15 sm:h-18 sm:pr-40 sm:text-lg"
          />
          <div className="absolute inset-y-2 right-2 hidden sm:block">
            <button
              type="submit"
              className="inline-flex h-full items-center gap-2 rounded-lg bg-gradient-to-r from-[#ff8a3d] to-[#ff3f2e] px-7 text-sm font-bold text-white shadow-md shadow-[#ff8a3d]/20 transition hover:-translate-y-0.5"
            >
              Search
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="submit"
            className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg bg-gradient-to-r from-[#ff8a3d] to-[#ff3f2e] text-white shadow-md shadow-[#ff8a3d]/20 transition hover:-translate-y-0.5 sm:hidden"
            aria-label="Search courses"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className="relative mx-auto mt-8 w-full max-w-3xl"
    >
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5 sm:pl-7">
          <Search className="h-5 w-5 text-slate-400 transition-colors duration-300 group-focus-within:text-cyan-600 sm:h-6 sm:w-6" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses, skills, or topics"
          className="block h-16 w-full rounded-full border border-slate-200 bg-white/95 py-4 pl-13 pr-16 text-base text-slate-950 shadow-2xl shadow-slate-900/15 outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/15 sm:h-20 sm:pl-17 sm:pr-40 sm:text-lg"
        />
        <div className="absolute inset-y-2 right-2 hidden sm:block">
          <button
            type="submit"
            className="inline-flex h-full items-center gap-2 rounded-full bg-slate-950 px-8 text-sm font-bold text-white shadow-md shadow-slate-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-700"
          >
            Search
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="submit"
          className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950 text-white shadow-md shadow-slate-950/20 transition hover:bg-cyan-700 sm:hidden"
          aria-label="Search courses"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
