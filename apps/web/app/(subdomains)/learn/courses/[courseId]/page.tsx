import { prisma } from "@repo/db";
import type { Module, Session } from "@repo/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { PlayCircle, Code, FileText, CheckSquare, FileEdit } from "lucide-react";

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>
}) {
  const { courseId } = await params;
  
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      author: true,
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

  if (!course) {
    notFound();
  }

  // Get the very first session to use as the "Start Course" link
  const firstSession = course.modules[0]?.sessions[0];

  const getSessionIcon = (type: string) => {
    switch (type) {
      case "LESSON_VIDEO": return <PlayCircle className="w-5 h-5 text-blue-500" />;
      case "LESSON_TEXT": return <FileText className="w-5 h-5 text-slate-500" />;
      case "EXERCISE_CODING": return <Code className="w-5 h-5 text-emerald-500" />;
      case "EXERCISE_QUIZ": return <CheckSquare className="w-5 h-5 text-purple-500" />;
      case "EXERCISE_ESSAY": return <FileEdit className="w-5 h-5 text-orange-500" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 w-full">
      
      {/* Course Header */}
      <div className="mb-12 border-b border-slate-200 dark:border-slate-800 pb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
          {course.title}
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl">
          {course.description}
        </p>
        
        <div className="flex items-center gap-6">
          {firstSession ? (
            <Link 
              href={`/courses/${course.id}/sessions/${firstSession.id}`}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-full transition-colors shadow-lg shadow-blue-500/20"
            >
              Start Course
            </Link>
          ) : (
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 px-8 py-3 rounded-full font-semibold">
              Coming Soon
            </span>
          )}
          
          <div className="flex items-center gap-3 border-l border-slate-300 dark:border-slate-700 pl-6">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
              {course.author.name?.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{course.author.name}</p>
              <p className="text-xs text-slate-500">Instructor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Curriculum</h2>
        
        <div className="space-y-6">
          {course.modules.map((module: Module & { sessions: Session[] }, mIdx: number) => (
            <div key={module.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              {/* Module Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Section {mIdx + 1}: {module.title}
                </h3>
                <span className="text-sm font-medium text-slate-500">
                  {module.sessions.length} sessions
                </span>
              </div>
              
              {/* Sessions List */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {module.sessions.map((session: Session, sIdx: number) => (
                  <Link 
                    key={session.id}
                    href={`/courses/${course.id}/sessions/${session.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group"
                  >
                    <div className="text-slate-400 font-mono text-sm w-6">
                      {mIdx + 1}.{sIdx + 1}
                    </div>
                    {getSessionIcon(session.type)}
                    <span className="font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {session.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
