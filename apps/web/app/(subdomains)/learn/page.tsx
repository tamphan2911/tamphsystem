import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";
import { HeroSearchBox } from "../../../components/HeroSearchBox";
import { TypingEffect } from "../../../components/TypingEffect";

export const dynamic = "force-dynamic";

export default async function LearnLandingPage() {
  const session = await auth();
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      author: true,
      modules: { include: { sessions: true } },
    },
    take: 3,
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

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7fbff] text-slate-950">
      <section className="relative flex min-h-screen items-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(34,211,238,0.22),transparent_30%),radial-gradient(circle_at_85%_18%,rgba(16,185,129,0.16),transparent_28%),linear-gradient(180deg,#ffffff_0%,#eef8ff_55%,#f7fbff_100%)]" />
        <div className="absolute left-6 top-6 hidden h-24 w-24 rounded-full border border-cyan-200/80 md:block" />
        <div className="absolute bottom-10 right-8 hidden h-36 w-36 rounded-full border border-emerald-200/80 lg:block" />

        <div className="relative mx-auto w-full max-w-7xl">
          <div className="mx-auto max-w-5xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white/80 px-4 py-2 text-sm font-bold text-cyan-800 shadow-sm">
              <Sparkles className="h-4 w-4" />
              TamphSystem Learn
            </div>

            <p className="mt-8 text-lg font-semibold text-slate-500">
              Find your next course in
            </p>
            <h1 className="mt-3 min-h-[7rem] text-balance text-5xl font-black leading-none tracking-tight sm:min-h-[8.5rem] sm:text-7xl lg:text-8xl">
              <TypingEffect />
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Browse practical courses, inspect the curriculum, and start
              learning when you are ready. Guests can explore the catalog;
              enrollment starts with a TamphSystem account.
            </p>

            <HeroSearchBox />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/courses"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-300 hover:text-cyan-800"
              >
                <BookOpen className="h-4 w-4" />
                Browse all courses
              </Link>
              {session?.user ? (
                <Link
                  href="/profile"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-cyan-700 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-800"
                >
                  My learning profile
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-cyan-700 px-5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-cyan-800"
                >
                  Log in to enroll
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="mt-14 grid gap-4 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div className="grid grid-cols-3 gap-3 rounded-lg border border-white bg-white/70 p-3 shadow-xl shadow-cyan-900/10 backdrop-blur">
              {[
                { label: "Courses", value: courses.length || "New" },
                { label: "Sessions", value: totalSessions || "Live" },
                { label: "Access", value: "Guest" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg bg-white px-3 py-4 text-center shadow-sm"
                >
                  <p className="text-2xl font-black text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase text-slate-400">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {courses.map((course) => {
                const sessions = course.modules.reduce(
                  (sum, module) => sum + module.sessions.length,
                  0,
                );
                return (
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    className="group rounded-lg border border-slate-200 bg-white p-5 shadow-lg shadow-slate-900/5 transition hover:-translate-y-1 hover:border-cyan-300 hover:shadow-xl"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                      <GraduationCap className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 line-clamp-2 text-base font-black leading-6">
                      {course.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                      {course.description || "Explore this course curriculum."}
                    </p>
                    <div className="mt-5 flex items-center justify-between text-xs font-bold text-slate-400">
                      <span>{sessions} sessions</span>
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1 group-hover:text-cyan-700" />
                    </div>
                  </Link>
                );
              })}

              {courses.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-3">
                  <Clock className="mx-auto h-8 w-8 text-slate-400" />
                  <h2 className="mt-3 font-black">Courses are coming soon</h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Published courses from admin will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap justify-center gap-3 text-sm font-semibold text-slate-500">
            {[
              "Explore before signing in",
              "Enroll after login",
              "Track progress in your profile",
            ].map((text) => (
              <span key={text} className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {text}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
