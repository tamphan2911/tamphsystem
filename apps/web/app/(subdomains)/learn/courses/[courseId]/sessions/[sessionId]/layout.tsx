import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  CheckSquare,
  Code,
  FileEdit,
  FileText,
  PlayCircle,
} from "lucide-react";
import { auth } from "../../../../../../../auth";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

function getSessionIcon(type: string, isActive: boolean) {
  const color = isActive
    ? "text-blue-600 dark:text-blue-400"
    : "text-slate-400 dark:text-slate-500";

  switch (type) {
    case "LESSON_VIDEO":
      return <PlayCircle className={`h-4 w-4 ${color}`} />;
    case "EXERCISE_CODING":
      return <Code className={`h-4 w-4 ${color}`} />;
    case "EXERCISE_QUIZ":
      return <CheckSquare className={`h-4 w-4 ${color}`} />;
    case "EXERCISE_ESSAY":
      return <FileEdit className={`h-4 w-4 ${color}`} />;
    default:
      return <FileText className={`h-4 w-4 ${color}`} />;
  }
}

export default async function LearningInterfaceLayout({
  params,
  children,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
  children: React.ReactNode;
}) {
  const { courseId, sessionId } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const [course, completions] = await Promise.all([
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { sessions: { orderBy: { order: "asc" } } },
        },
      },
    }),
    userId
      ? prisma.sessionCompletion.findMany({
          where: { userId, courseId },
          select: { sessionId: true },
        })
      : Promise.resolve([]),
  ]);

  if (!course) notFound();

  const completedSessionIds = new Set(
    completions.map((completion) => completion.sessionId),
  );

  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-slate-950 md:flex-row">
      <aside className="w-full flex-shrink-0 border-r border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/30 md:sticky md:top-20 md:h-[calc(100vh-5rem)] md:w-80 md:overflow-y-auto">
        <div className="border-b border-slate-200 p-6 dark:border-slate-800">
          <Link
            href={`/courses/${course.id}`}
            className="text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-blue-600"
          >
            Back to course
          </Link>
          <h2 className="mt-2 text-lg font-bold leading-tight text-slate-900 dark:text-white">
            {course.title}
          </h2>
        </div>

        <div className="py-4">
          {course.modules.map((module, moduleIndex) => (
            <div key={module.id} className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Section {moduleIndex + 1}: {module.title}
                </h3>
              </div>

              <ul className="mt-1 space-y-0.5">
                {module.sessions.map((item, sessionIndex) => {
                  const isActive = item.id === sessionId;
                  const isComplete = completedSessionIds.has(item.id);

                  return (
                    <li key={item.id}>
                      <Link
                        href={`/courses/${course.id}/sessions/${item.id}`}
                        className={`flex items-start gap-3 px-6 py-2.5 transition-colors ${
                          isActive
                            ? "border-r-2 border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {isComplete ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            getSessionIcon(item.type, isActive)
                          )}
                        </div>
                        <span
                          className={`text-sm font-medium leading-snug ${
                            isActive
                              ? "text-blue-700 dark:text-blue-300"
                              : "text-slate-600 dark:text-slate-400"
                          }`}
                        >
                          {sessionIndex + 1}. {item.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </aside>

      <main
        id="learn-main-content"
        className="relative min-w-0 flex-1 scroll-smooth md:h-[calc(100vh-5rem)] md:overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
