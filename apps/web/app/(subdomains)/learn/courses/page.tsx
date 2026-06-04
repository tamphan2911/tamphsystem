import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Search } from "lucide-react";
import { auth } from "../../../../auth";
import { prisma } from "@repo/db";
import { enrollInCourse } from "../actions";

export const dynamic = "force-dynamic";

export default async function CoursesListingPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const courses = await prisma.course.findMany({
    where: {
      isPublished: true,
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              {
                description: {
                  contains: query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    },
    include: {
      author: true,
      modules: {
        orderBy: { order: "asc" },
        include: { sessions: { orderBy: { order: "asc" } } },
      },
      enrollments: userId ? { where: { userId } } : false,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-center">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {query ? `Search results for "${query}"` : "Course Catalog"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Browse published courses, inspect the curriculum, enroll, and
              continue through lessons, videos, coding exercises, and quizzes.
            </p>
          </div>
          <form action="/courses" className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search catalog"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {courses.map((course) => {
          const totalSessions = course.modules.reduce(
            (acc, mod) => acc + mod.sessions.length,
            0,
          );
          const enrollment = course.enrollments?.[0];
          const enrollAction = enrollInCourse.bind(null, course.id);

          return (
            <article
              key={course.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold leading-6">
                      {course.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                      {course.description || "No description yet."}
                    </p>
                  </div>
                  {enrollment && (
                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      Enrolled
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-1 flex-col p-5">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs uppercase text-slate-400">Modules</p>
                    <p className="mt-1 font-bold">{course.modules.length}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
                    <p className="text-xs uppercase text-slate-400">Sessions</p>
                    <p className="mt-1 font-bold">{totalSessions}</p>
                  </div>
                </div>

                {enrollment && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Progress</span>
                      <span>{Math.round(enrollment.progressPercentage)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full bg-blue-600"
                        style={{
                          width: `${Math.round(enrollment.progressPercentage)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <BookOpen className="h-4 w-4" />
                    {course.author.name || course.author.email}
                  </div>
                  {enrollment ? (
                    <Link
                      href={`/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
                    >
                      Continue <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <form action={enrollAction}>
                      <input
                        type="hidden"
                        name="callbackUrl"
                        value={`/courses/${course.id}`}
                      />
                      <button className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                        Enroll
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </article>
          );
        })}

        {courses.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <Clock className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-3 font-bold">
              {query ? "No matching courses" : "No published courses"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {query
                ? "Try a different keyword or browse the full catalog."
                : "Publish a course from admin to show it here."}
            </p>
            {query && (
              <Link
                href="/courses"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                View all courses
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
