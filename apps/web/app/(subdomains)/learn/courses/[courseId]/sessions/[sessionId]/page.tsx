import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { prisma } from "@repo/db";
import { CodingExercise } from "../../../../../../../components/CodingExercise";
import { QuizExercise } from "../../../../../../../components/QuizExercise";
import { GsapScrollToTop } from "../../../../../../../components/GsapScrollToTop";
import { updateCourseProgress } from "../../../../actions";

export const dynamic = "force-dynamic";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
}) {
  const { courseId, sessionId } = await params;

  const [session, course] = await Promise.all([
    prisma.session.findUnique({ where: { id: sessionId } }),
    prisma.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: { sessions: { orderBy: { order: "asc" } } },
        },
      },
    }),
  ]);

  if (!session || !course) notFound();

  const orderedSessions = course.modules.flatMap((module) => module.sessions);
  const currentIndex = orderedSessions.findIndex(
    (item) => item.id === session.id,
  );
  const nextSession = orderedSessions[currentIndex + 1];
  const progressAfterThis =
    orderedSessions.length > 0
      ? Math.round(
          ((Math.max(currentIndex, 0) + 1) / orderedSessions.length) * 100,
        )
      : 100;
  const completeAction = updateCourseProgress.bind(
    null,
    courseId,
    progressAfterThis,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
              Session {currentIndex + 1} of {orderedSessions.length}
            </p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight">
              {session.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {[session.type.replace("_", " ").toLowerCase(), session.year]
                .filter(Boolean)
                .join(" • ")}
            </p>
          </div>
          <form action={completeAction}>
            <button className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              Mark Complete ({progressAfterThis}%)
            </button>
          </form>
        </div>
      </div>

      {session.type === "LESSON_TEXT" && (
        <div className="relative min-h-[60vh] whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-6 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {session.content || "No content provided."}
          <GsapScrollToTop />
        </div>
      )}

      {session.type === "LESSON_VIDEO" && session.videoUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <iframe
            src={session.videoUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {session.type === "EXERCISE_CODING" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="font-bold">Instructions</h2>
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
              {session.content ||
                "Write your code in the editor below to solve the exercise."}
            </div>
          </div>
          <CodingExercise
            initialCode={session.initialCode || ""}
            language={session.codingLanguage || "python"}
            expectedOutput={session.expectedOutput || ""}
          />
        </div>
      )}

      {session.type === "EXERCISE_QUIZ" && (
        <QuizExercise title={session.title} />
      )}

      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link
          href={`/courses/${courseId}`}
          className="text-sm font-semibold text-slate-500 hover:text-slate-950 dark:hover:text-white"
        >
          Back to course
        </Link>
        {nextSession ? (
          <Link
            href={`/courses/${courseId}/sessions/${nextSession.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Next session
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="text-sm font-semibold text-emerald-600">
            Final session
          </span>
        )}
      </div>
    </div>
  );
}
