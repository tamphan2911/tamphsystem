import Link from "next/link";
import { ArrowRight, BarChart3, BookOpen, CheckCircle2, Clock, Code2, GraduationCap, PlayCircle } from "lucide-react";
import { auth } from "../../../auth";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

export default async function LearnDashboardPage() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [enrollments, publishedCourses] = await Promise.all([
    userId
      ? prisma.enrollment.findMany({
          where: { userId },
          include: {
            course: {
              include: {
                author: true,
                modules: { include: { sessions: true }, orderBy: { order: "asc" } },
              },
            },
          },
          orderBy: { enrolledAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.course.findMany({
      where: { isPublished: true },
      include: {
        author: true,
        modules: { include: { sessions: true } },
      },
      take: 6,
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const enrolledCourseIds = new Set(enrollments.map((item) => item.courseId));
  const recommended = publishedCourses.filter((course) => !enrolledCourseIds.has(course.id)).slice(0, 3);
  const activeEnrollment = enrollments.find((item) => item.progressPercentage < 100) ?? enrollments[0];
  const totalProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, item) => sum + item.progressPercentage, 0) / enrollments.length)
    : 0;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <GraduationCap className="h-4 w-4" />
              Learning dashboard
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              Continue enrolled courses, browse new modules, and use practice sessions for coding, quizzes, and applied academic workflows.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/courses" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                Browse courses
                <ArrowRight className="h-4 w-4" />
              </Link>
              {activeEnrollment && (
                <Link href={`/courses/${activeEnrollment.courseId}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                  Resume learning
                </Link>
              )}
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-400">Enrolled courses</p>
              <p className="mt-2 text-3xl font-black">{enrollments.length}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-bold uppercase text-slate-400">Average progress</p>
              <p className="mt-2 text-3xl font-black text-blue-600">{totalProgress}%</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">My courses</h2>
            <Link href="/courses" className="text-sm font-semibold text-blue-600">View all</Link>
          </div>

          {enrollments.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {enrollments.map((enrollment) => {
                const sessions = enrollment.course.modules.flatMap((module) => module.sessions);
                const firstSession = sessions[0];
                return (
                  <article key={enrollment.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-bold">{enrollment.course.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">{enrollment.course.author.name || enrollment.course.author.email}</p>
                      </div>
                      <span className="rounded bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {Math.round(enrollment.progressPercentage)}%
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div className="h-full bg-blue-600" style={{ width: `${Math.round(enrollment.progressPercentage)}%` }} />
                    </div>
                    <div className="mt-4 flex items-center justify-between text-sm">
                      <span className="text-slate-500">{sessions.length} sessions</span>
                      <Link href={firstSession ? `/courses/${enrollment.courseId}/sessions/${firstSession.id}` : `/courses/${enrollment.courseId}`} className="inline-flex items-center gap-1 font-semibold text-blue-600">
                        Continue <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
              <h3 className="mt-3 font-bold">No enrolled courses yet</h3>
              <p className="mt-1 text-sm text-slate-500">Browse the catalog and enroll in a course to start tracking progress.</p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="flex items-center gap-2 font-bold">
              <Clock className="h-4 w-4 text-blue-600" />
              Recommended next
            </h2>
            <div className="mt-4 space-y-3">
              {recommended.map((course) => (
                <Link key={course.id} href={`/courses/${course.id}`} className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800">
                  <p className="text-sm font-semibold">{course.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{course.modules.reduce((sum, module) => sum + module.sessions.length, 0)} sessions</p>
                </Link>
              ))}
              {recommended.length === 0 && <p className="text-sm text-slate-500">No recommendations yet.</p>}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold">Learning tools</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {[
                { icon: PlayCircle, text: "Video and text sessions" },
                { icon: Code2, text: "Python coding exercises" },
                { icon: CheckCircle2, text: "Quiz practice and feedback" },
                { icon: BarChart3, text: "Progress tracking by course" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-blue-600" />
                    {item.text}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
