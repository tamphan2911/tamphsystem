"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, Terminal } from "lucide-react";

export function HeroSearchBox() {
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/courses?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="relative mt-8 w-full max-w-3xl">
      <div className="group relative rounded-lg border border-stone-300 bg-white p-2 shadow-[0_22px_60px_rgba(67,20,7,0.14)]">
        <div className="pointer-events-none absolute left-5 top-1/2 hidden -translate-y-1/2 items-center gap-2 text-xs font-black uppercase text-stone-400 sm:flex">
          <Terminal className="h-4 w-4 text-[#ff4f31]" />
          search
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center sm:left-28">
          <Search className="h-5 w-5 text-stone-400 transition-colors duration-300 group-focus-within:text-[#ff4f31]" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses, skills, or topics"
          className="block h-14 w-full rounded-md border border-transparent bg-[#fffaf3] py-4 pl-11 pr-14 text-base font-semibold text-stone-950 outline-none transition placeholder:font-medium placeholder:text-stone-400 focus:border-[#ff9f8a] focus:bg-white focus:ring-4 focus:ring-[#ff4f31]/10 sm:h-16 sm:pl-36 sm:pr-40 sm:text-lg"
        />
        <div className="absolute inset-y-4 right-4 hidden sm:block">
          <button
            type="submit"
            className="inline-flex h-full items-center gap-2 rounded-md bg-stone-950 px-6 text-sm font-black text-white shadow-md shadow-stone-950/20 transition hover:-translate-y-0.5 hover:bg-[#ff4f31]"
          >
            Search
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <button
          type="submit"
          className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md bg-stone-950 text-white shadow-md shadow-stone-950/20 transition hover:bg-[#ff4f31] sm:hidden"
          aria-label="Search courses"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}
