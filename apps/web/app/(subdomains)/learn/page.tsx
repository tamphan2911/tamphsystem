import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, Code2, GraduationCap, Search } from "lucide-react";
import { HeroSearchBox } from "../../../components/HeroSearchBox";
import { TypingEffect } from "../../../components/TypingEffect";

const learningTracks = [
  {
    title: "Finance and banking",
    description: "Structured lessons for core financial reasoning, research methods, and applied banking topics.",
    icon: BarChart3,
  },
  {
    title: "Data and coding",
    description: "Practice-oriented sessions with Python exercises, output checks, and guided technical work.",
    icon: Code2,
  },
  {
    title: "Research skills",
    description: "Workflows for literature review, modeling, references, writing, and publication preparation.",
    icon: BookOpen,
  },
];

export default function LearnLandingPage() {
  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1fr_24rem] lg:items-center lg:py-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <GraduationCap className="h-4 w-4 text-blue-600" />
            TamphSystem Learn
          </div>

          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-normal text-slate-950 dark:text-white md:text-4xl">
            Learn finance, research, and technical skills through practical course workflows.
          </h1>

          <div className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">
            Explore courses in <TypingEffect />
          </div>

          <div className="mt-8 max-w-3xl">
            <HeroSearchBox />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Browse courses
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              My profile
            </Link>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-950 dark:text-white">Course workspace</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Search, study, practice, track</p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {[
              "Text and video lessons organized by modules",
              "Python coding exercises with in-browser execution",
              "Quiz and assessment flows for course practice",
              "Profile and progress surfaces for learners",
            ].map((item) => (
              <div key={item} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="border-y border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-7 max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Tracks</p>
            <h2 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 dark:text-white">
              Study paths for applied academic work
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {learningTracks.map((track) => {
              const Icon = track.icon;
              return (
                <article key={track.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                  <Icon className="h-5 w-5 text-blue-600" />
                  <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">{track.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{track.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
