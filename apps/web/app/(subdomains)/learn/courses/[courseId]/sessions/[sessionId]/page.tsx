import { prisma } from "@repo/db";
import { notFound } from "next/navigation";
import { CodingExercise } from "../../../../../../../components/CodingExercise";
import { QuizExercise } from "../../../../../../../components/QuizExercise";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {session.title}
        </h1>
        <div className="w-12 h-1 bg-blue-600 rounded-full"></div>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        
        {/* Render Text Lesson */}
        {session.type === "LESSON_TEXT" && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm whitespace-pre-wrap text-slate-700 dark:text-slate-300">
            {session.content || "No content provided."}
          </div>
        )}

        {/* Render Video Lesson */}
        {session.type === "LESSON_VIDEO" && session.videoUrl && (
          <div className="aspect-video w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-900">
            <iframe 
              src={session.videoUrl} 
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        )}

        {/* Render Coding Exercise */}
        {session.type === "EXERCISE_CODING" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Instructions</h3>
              <div className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                {session.content || "Write your code in the editor below to solve the exercise."}
              </div>
            </div>
            
            <CodingExercise 
              initialCode={session.initialCode || ""} 
              language={session.codingLanguage || "python"}
              expectedOutput={session.expectedOutput || ""}
            />
          </div>
        )}

        {/* Render Quiz Exercise */}
        {session.type === "EXERCISE_QUIZ" && (
          <QuizExercise title={session.title} />
        )}
      </div>
    </div>
  );
}
