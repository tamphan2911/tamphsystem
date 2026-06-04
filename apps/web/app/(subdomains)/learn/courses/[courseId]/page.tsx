import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckSquare,
  Code,
  FileEdit,
  FileText,
  PlayCircle,
  UserCircle,
} from "lucide-react";
import { auth } from "../../../../../auth";
import { prisma, type Module, type Session } from "@repo/db";
import { enrollInCourse } from "../../actions";

export const dynamic = "force-dynamic";

function getSessionIcon(type: string) {
  switch (type) {
    case "LESSON_VIDEO":
      return <PlayCircle className="h-5 w-5 text-blue-500" />;
    case "LESSON_TEXT":
      return <FileText className="h-5 w-5 text-slate-500" />;
    case "EXERCISE_CODING":
      return <Code className="h-5 w-5 text-emerald-500" />;
    case "EXERCISE_QUIZ":
      return <CheckSquare className="h-5 w-5 text-purple-500" />;
    case "EXERCISE_ESSAY":
      return <FileEdit className="h-5 w-5 text-orange-500" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      author: true,
      enrollments: userId ? { where: { userId } } : false,
      modules: {
        orderBy: { order: "asc" },
        include: {
          sessions: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!course) notFound();

  const firstSession = course.modules[0]?.sessions[0];
  const enrollment = course.enrollments?.[0];
  const totalSessions = course.modules.reduce(
    (sum, module) => sum + module.sessions.length,
    0,
  );
  const enrollAction = enrollInCourse.bind(null, course.id);

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div>
            <Link
              href="/courses"
              className="text-sm font-semibold text-blue-600"
            >
              ← Back to catalog
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
              {course.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
              {course.description || "No course description yet."}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span className="inline-flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                {course.author.name || course.author.email}
              </span>
              <span>{course.modules.length} modules</span>
              <span>{totalSessions} sessions</span>
            </div>
          </div>

          <aside className="rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
            <p className="text-xs font-bold uppercase text-slate-400">
              Your progress
            </p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {Math.round(enrollment?.progressPercentage ?? 0)}%
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-blue-600"
                style={{
                  width: `${Math.round(enrollment?.progressPercentage ?? 0)}%`,
                }}
              />
            </div>
            <div className="mt-5">
              {enrollment ? (
                <Link
                  href={
                    firstSession
                      ? `/courses/${course.id}/sessions/${firstSession.id}`
                      : "#"
                  }
                  className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Start / Continue
                </Link>
              ) : (
                <form action={enrollAction}>
                  <input
                    type="hidden"
                    name="callbackUrl"
                    value={`/courses/${course.id}`}
                  />
                  <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
                    Enroll in Course
                  </button>
                </form>
              )}
            </div>
          </aside>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Curriculum</h2>
        {course.modules.map(
          (module: Module & { sessions: Session[] }, moduleIndex: number) => (
            <div
              key={module.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div>
                  <p className="text-xs font-bold uppercase text-slate-400">
                    Module {moduleIndex + 1}
                  </p>
                  <h3 className="font-bold">{module.title}</h3>
                </div>
                <span className="text-sm text-slate-500">
                  {module.sessions.length} sessions
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {module.sessions.map((item: Session, sessionIndex: number) => (
                  <Link
                    key={item.id}
                    href={
                      enrollment
                        ? `/courses/${course.id}/sessions/${item.id}`
                        : "#"
                    }
                    className={`flex items-center gap-4 px-5 py-4 transition ${enrollment ? "hover:bg-slate-50 dark:hover:bg-slate-800/40" : "cursor-not-allowed opacity-60"}`}
                  >
                    <span className="w-10 text-sm font-mono text-slate-400">
                      {moduleIndex + 1}.{sessionIndex + 1}
                    </span>
                    {getSessionIcon(item.type)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {[item.type.replace("_", " ").toLowerCase(), item.year]
                          .filter(Boolean)
                          .join(" • ")}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ),
        )}
      </section>
    </div>
  );
}
