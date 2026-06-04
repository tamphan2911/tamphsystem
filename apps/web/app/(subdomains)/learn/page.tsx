import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Braces,
  CheckCircle2,
  Clock,
  Code2,
  FileText,
  GraduationCap,
  Layers3,
  PlayCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { HeroSearchBox } from "../../../components/HeroSearchBox";
import { TypingEffect } from "../../../components/TypingEffect";

export const dynamic = "force-dynamic";

const learningPillars = [
  {
    title: "Watch and read",
    description: "Short lessons keep concepts visible before practice.",
    icon: PlayCircle,
  },
  {
    title: "Practice with code",
    description: "Python, data, and applied exercises live beside the course.",
    icon: Code2,
  },
  {
    title: "Check understanding",
    description: "Quizzes and tasks turn each module into a feedback loop.",
    icon: CheckCircle2,
  },
];

export default async function LearnLandingPage() {
  const session = await auth();
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      author: true,
      modules: { include: { sessions: true } },
    },
    take: 4,
    orderBy: { updatedAt: "desc" },
  });

  const totalSessions = courses.reduce(
    (sum, course) =>
      sum +
      course.modules.reduce(
        (moduleSum, module) => moduleSum + module.sessions.length,
        0,
      ),
    0,
  );

  const heroNodes = [
    {
      label: "Search",
      value: "Find a topic",
      icon: Search,
      className: "left-4 top-6 sm:left-8",
    },
    {
      label: "Course",
      value: courses[0]?.title || "Python for data analysis",
      icon: BookOpen,
      className: "right-4 top-24 sm:right-10",
    },
    {
      label: "Module",
      value: "Practice path",
      icon: Layers3,
      className: "left-8 bottom-24 sm:left-14",
    },
    {
      label: "Enroll",
      value: "Login required",
      icon: GraduationCap,
      className: "right-8 bottom-8 sm:right-16",
    },
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff7ed] text-stone-950">
      <section className="relative px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(68,64,60,0.05)_1px,transparent_1px),linear-gradient(180deg,rgba(68,64,60,0.05)_1px,transparent_1px)] bg-[size:44px_44px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_18%_22%,rgba(255,79,49,0.18),transparent_32%),radial-gradient(circle_at_86%_18%,rgba(124,58,237,0.12),transparent_28%)]" />

        <div className="relative mx-auto max-w-7xl">
          <nav className="flex h-14 items-center justify-between rounded-lg border border-stone-200 bg-[#fffaf3]/85 px-3 shadow-sm backdrop-blur">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-950 text-white">
                <GraduationCap className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-black">
                  TamphSystem Learn
                </span>
                <span className="hidden text-xs font-semibold text-stone-500 sm:block">
                  Courses you can inspect before enrolling
                </span>
              </span>
            </Link>

            <div className="hidden items-center gap-1 text-sm font-bold text-stone-600 md:flex">
              <Link
                href="/courses"
                className="rounded-md px-3 py-2 transition hover:bg-white hover:text-stone-950"
              >
                Courses
              </Link>
              <Link
                href="/profile"
                className="rounded-md px-3 py-2 transition hover:bg-white hover:text-stone-950"
              >
                Profile
              </Link>
            </div>

            {session?.user ? (
              <Link
                href="/profile"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#ff4f31]"
              >
                Profile
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-stone-950 px-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#ff4f31]"
              >
                Log in
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </nav>

          <div className="grid min-h-[calc(100vh-5rem)] gap-12 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-[#ffb29f] bg-white px-3 py-2 text-sm font-black text-[#a6341f] shadow-sm">
                <Sparkles className="h-4 w-4" />
                Learn by seeing the path
              </div>

              <h1 className="mt-7 max-w-4xl text-balance text-5xl font-black leading-[0.94] tracking-tight sm:text-6xl lg:text-7xl">
                Courses and practice paths you can actually follow
              </h1>

              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-stone-700">
                Search practical courses, inspect every module, and enroll when
                you are ready. Guests can explore the catalog; login is only
                required when learning becomes personal.
              </p>

              <div className="mt-7 text-xl font-black text-stone-950 sm:text-2xl">
                Start with <TypingEffect />
              </div>

              <HeroSearchBox />

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/courses"
                  className="inline-flex h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-4 text-sm font-black text-stone-900 shadow-sm transition hover:-translate-y-0.5 hover:border-[#ff8c73] hover:text-[#a6341f]"
                >
                  <BookOpen className="h-4 w-4" />
                  Browse catalog
                </Link>
                <Link
                  href={session?.user ? "/profile" : "/login"}
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-[#ff4f31] px-4 text-sm font-black text-white shadow-lg shadow-[#ff4f31]/20 transition hover:-translate-y-0.5 hover:bg-stone-950"
                >
                  {session?.user ? "Open profile" : "Log in to enroll"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="relative min-h-[34rem] rounded-lg border border-stone-300 bg-[#fffaf3] p-4 shadow-[0_28px_80px_rgba(67,20,7,0.16)]">
              <div className="flex items-center justify-between border-b border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff4f31]" />
                  <span className="h-3 w-3 rounded-full bg-[#facc15]" />
                  <span className="h-3 w-3 rounded-full bg-[#22c55e]" />
                </div>
                <span className="rounded-md bg-stone-950 px-2 py-1 text-xs font-black uppercase text-white">
                  course canvas
                </span>
              </div>

              <div className="absolute inset-4 top-16 rounded-lg bg-[linear-gradient(90deg,rgba(120,113,108,0.16)_1px,transparent_1px),linear-gradient(180deg,rgba(120,113,108,0.16)_1px,transparent_1px)] bg-[size:34px_34px]" />
              <div className="absolute left-[17%] top-[31%] h-px w-[62%] rotate-12 bg-[#ff9f8a]" />
              <div className="absolute left-[17%] top-[58%] h-px w-[61%] -rotate-12 bg-[#c4b5fd]" />
              <div className="absolute left-[24%] top-[46%] h-px w-[49%] bg-stone-300" />

              {heroNodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.label}
                    className={`absolute z-10 w-52 rounded-lg border border-stone-300 bg-white p-4 shadow-xl shadow-stone-900/10 ${node.className}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#fff1ed] text-[#ff4f31]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase text-stone-400">
                          {node.label}
                        </p>
                        <p className="truncate text-sm font-black text-stone-950">
                          {node.value}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="absolute left-1/2 top-1/2 z-20 w-64 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-stone-950 bg-stone-950 p-5 text-white shadow-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#ffb29f]">
                    active path
                  </span>
                  <Braces className="h-4 w-4 text-[#ffb29f]" />
                </div>
                <h2 className="mt-4 text-2xl font-black leading-7">
                  See the course before you commit.
                </h2>
                <p className="mt-3 text-sm font-medium leading-6 text-stone-300">
                  Modules, sessions, exercises, and progress stay visible as you
                  move.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 border-y border-stone-300 py-6 md:grid-cols-4">
            {[
              { label: "Published courses", value: courses.length || "New" },
              { label: "Available sessions", value: totalSessions || "Live" },
              { label: "Guest browsing", value: "Open" },
              { label: "Enrollment", value: "Login" },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-white p-5">
                <p className="text-3xl font-black text-stone-950">
                  {item.value}
                </p>
                <p className="mt-1 text-sm font-bold text-stone-500">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase text-[#ff4f31]">
                Templates for learning
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">
                Pick a course like you would pick a workflow.
              </h2>
            </div>
            <p className="text-base font-semibold leading-7 text-stone-600">
              Each card exposes the path: modules, sessions, author, and the
              next action. Guests can inspect; signed-in learners can enroll and
              track progress.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-4">
            {courses.map((course) => {
              const sessions = course.modules.reduce(
                (sum, module) => sum + module.sessions.length,
                0,
              );
              return (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  className="group flex min-h-72 flex-col rounded-lg border border-stone-300 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#ff8c73] hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-[#fff1ed] px-2 py-1 text-xs font-black uppercase text-[#a6341f]">
                      Course
                    </span>
                    <ArrowRight className="h-4 w-4 text-stone-400 transition group-hover:translate-x-1 group-hover:text-[#ff4f31]" />
                  </div>
                  <h3 className="mt-6 line-clamp-3 text-xl font-black leading-6">
                    {course.title}
                  </h3>
                  <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-stone-600">
                    {course.description || "Explore this course curriculum."}
                  </p>
                  <div className="mt-auto grid grid-cols-2 gap-2 pt-6 text-sm font-bold text-stone-500">
                    <span className="rounded-md bg-[#fff7ed] px-3 py-2">
                      {course.modules.length} modules
                    </span>
                    <span className="rounded-md bg-[#fff7ed] px-3 py-2">
                      {sessions} sessions
                    </span>
                  </div>
                </Link>
              );
            })}

            {courses.length === 0 && (
              <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center lg:col-span-4">
                <Clock className="mx-auto h-8 w-8 text-stone-400" />
                <h2 className="mt-3 font-black">Courses are coming soon</h2>
                <p className="mt-2 text-sm text-stone-500">
                  Published courses from admin will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-3">
          {learningPillars.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-lg border border-stone-300 bg-[#fffaf3] p-6"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-stone-950 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-black">{item.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-stone-600">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mx-auto mt-10 max-w-7xl rounded-lg bg-stone-950 p-6 text-white sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-black uppercase text-[#ffb29f]">
                <FileText className="h-4 w-4" />
                Simple enough to browse. Structured enough to learn.
              </div>
              <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-tight">
                Build your learning path from visible modules, exercises, and
                progress.
              </h2>
            </div>
            <Link
              href="/courses"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[#ff4f31] px-5 text-sm font-black text-white transition hover:bg-white hover:text-stone-950"
            >
              Explore courses
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
