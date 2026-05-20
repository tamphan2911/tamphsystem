"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  Database,
  GraduationCap,
  Library,
  Mail,
  NotebookPen,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";

const focusAreas = [
  {
    title: "Academic research",
    description: "Banking, fintech, corporate finance, publication strategy, and research production workflows.",
    icon: Library,
  },
  {
    title: "Learning systems",
    description: "Course infrastructure, assessments, coding exercises, and operational tools for academic teams.",
    icon: GraduationCap,
  },
  {
    title: "Fintech software",
    description: "Data products, internal platforms, quantitative tooling, and workflow automation.",
    icon: TrendingUp,
  },
];

const systems = [
  {
    name: "Learning platform",
    href: "https://learn.tamph.com",
    description: "Courses, modules, sessions, coding exercises, and student learning flows.",
    meta: "LMS",
  },
  {
    name: "Research hub",
    href: "https://research.tamph.com",
    description: "Pipeline tracking for research, journals, publisher accounts, submissions, and publications.",
    meta: "Research operations",
  },
  {
    name: "Admin console",
    href: "https://admin.tamph.com",
    description: "User, role, and platform management for the connected subdomains.",
    meta: "System control",
  },
];

const notes = [
  "Lecturer and researcher working across finance, banking, fintech, and software engineering.",
  "Building practical infrastructure for research teams, teaching workflows, and publication operations.",
  "Interested in systems that reduce repetitive academic work and make complex processes easier to manage.",
];

export default function PersonalPortfolio() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-slate-50/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link href="/" className="text-sm font-black tracking-wide">
            TAMPH<span className="text-blue-600">.</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300 md:flex">
            <a href="#work" className="transition hover:text-slate-950 dark:hover:text-white">Work</a>
            <a href="#systems" className="transition hover:text-slate-950 dark:hover:text-white">Systems</a>
            <a href="#research" className="transition hover:text-slate-950 dark:hover:text-white">Research</a>
            <a href="#contact" className="transition hover:text-slate-950 dark:hover:text-white">Contact</a>
          </nav>
          <ThemeToggle />
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:py-20">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              <BriefcaseBusiness className="h-3.5 w-3.5 text-blue-600" />
              Lecturer, researcher, and software builder
            </div>

            <h1 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-normal text-slate-950 dark:text-white md:text-4xl">
              I build academic and fintech systems around research, learning, and data-driven work.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              I work at the intersection of finance, software engineering, and academic research. This site is the front door to my courses, research operations, and internal tools.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="https://learn.tamph.com"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Learning platform
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="https://research.tamph.com"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-white dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
              >
                Research hub
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <p className="text-sm font-bold">Current focus</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Research and platform work</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="mt-5 space-y-4">
              {notes.map((note) => (
                <div key={note} className="flex gap-3">
                  <div className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-blue-600" />
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{note}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section id="work" className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto max-w-6xl px-5">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Work</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal">What I spend time on</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                My work combines research management, teaching infrastructure, and applied software systems.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {focusAreas.map((area) => {
                const Icon = area.icon;
                return (
                  <article key={area.title} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
                    <Icon className="h-5 w-5 text-blue-600" />
                    <h3 className="mt-4 text-base font-bold">{area.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{area.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="systems" className="mx-auto max-w-6xl px-5 py-14">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Systems</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal">Connected platforms</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              The main domain stays personal. Subdomains host the actual tools and workflows.
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            {systems.map((system) => (
              <Link
                key={system.name}
                href={system.href}
                className="group grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700 md:grid-cols-[10rem_1fr_auto] md:items-center"
              >
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{system.meta}</span>
                <div>
                  <h3 className="text-base font-bold">{system.name}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{system.description}</p>
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />
              </Link>
            ))}
          </div>
        </section>

        <section id="research" className="border-y border-slate-200 bg-white py-14 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Research</p>
              <h2 className="mt-2 text-2xl font-bold tracking-normal">Research operations, not just publication lists</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                I manage research as a pipeline: idea, data, model, writing, journal targeting, submission, revision, acceptance, publication, and claim documentation.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                { icon: NotebookPen, text: "Production notes for data, modeling, writing, humanizing, and references." },
                { icon: BookOpen, text: "Journal database with ranks, ISSN, publisher, APC, fees, and account records." },
                { icon: Database, text: "Submission tracking with the journal and account used for each manuscript." },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                    <Icon className="mt-0.5 h-4 w-4 flex-none text-blue-600" />
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-5 py-14">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-blue-600">Contact</p>
                <h2 className="mt-2 text-2xl font-bold tracking-normal">For academic, research, or system work</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Use the connected systems for structured work. For direct conversation, reach out by email or through the appropriate platform.
                </p>
              </div>
              <a
                href="mailto:admin@tamph.com"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Mail className="h-4 w-4" />
                admin@tamph.com
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Tamph.</p>
          <p>Finance, research, learning systems, and software infrastructure.</p>
        </div>
      </footer>
    </div>
  );
}
