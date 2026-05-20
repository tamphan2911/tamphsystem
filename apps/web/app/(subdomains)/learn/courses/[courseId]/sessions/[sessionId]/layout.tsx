import { prisma } from "@repo/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Code, FileText, CheckSquare, FileEdit, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LearningInterfaceLayout({
  params,
  children,
}: {
  params: Promise<{ courseId: string; sessionId: string }>;
  children: React.ReactNode;
}) {
  const { courseId, sessionId } = await params;

  // Fetch the full course structure for the sidebar
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { order: 'asc' },
        include: {
          sessions: {
            orderBy: { order: 'asc' }
          }
        }
      }
    }
  });

  if (!course) notFound();

  const getSessionIcon = (type: string, isActive: boolean) => {
    const color = isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500";
    switch (type) {
      case "LESSON_VIDEO": return <PlayCircle className={`w-4 h-4 ${color}`} />;
      case "LESSON_TEXT": return <FileText className={`w-4 h-4 ${color}`} />;
      case "EXERCISE_CODING": return <Code className={`w-4 h-4 ${color}`} />;
      case "EXERCISE_QUIZ": return <CheckSquare className={`w-4 h-4 ${color}`} />;
      case "EXERCISE_ESSAY": return <FileEdit className={`w-4 h-4 ${color}`} />;
      default: return <FileText className={`w-4 h-4 ${color}`} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-white dark:bg-slate-950">
      
      {/* Sidebar Curriculum (Left Pane) */}
      <aside className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 md:h-[calc(100vh-5rem)] md:sticky md:top-20 overflow-y-auto flex-shrink-0">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <Link href={`/courses/${course.id}`} className="text-xs font-semibold tracking-wider text-slate-500 uppercase hover:text-blue-600 transition-colors">
            ← Back to Course
          </Link>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-2 leading-tight">
            {course.title}
          </h2>
        </div>

        <div className="py-4">
          {course.modules.map((module, mIdx) => (
            <div key={module.id} className="mb-4">
              <div className="px-6 py-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Section {mIdx + 1}: {module.title}
                </h3>
              </div>
              
              <ul className="mt-1 space-y-0.5">
                {module.sessions.map((session, sIdx) => {
                  const isActive = session.id === sessionId;
                  return (
                    <li key={session.id}>
                      <Link 
                        href={`/courses/${course.id}/sessions/${session.id}`}
                        className={`flex items-start gap-3 px-6 py-2.5 transition-colors ${
                          isActive 
                            ? "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-600 dark:border-blue-400" 
                            : "hover:bg-slate-100 dark:hover:bg-slate-800/50"
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {getSessionIcon(session.type, isActive)}
                        </div>
                        <span className={`text-sm font-medium leading-snug ${
                          isActive 
                            ? "text-blue-700 dark:text-blue-300" 
                            : "text-slate-600 dark:text-slate-400"
                        }`}>
                          {sIdx + 1}. {session.title}
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

      {/* Main Learning Content Area (Right Pane) */}
      <main id="learn-main-content" className="flex-1 min-w-0 md:h-[calc(100vh-5rem)] overflow-y-auto relative scroll-smooth">
        {children}
      </main>

    </div>
  );
}
