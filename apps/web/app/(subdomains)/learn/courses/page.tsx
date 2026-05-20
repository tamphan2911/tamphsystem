import { prisma } from "@repo/db";
import Link from "next/link";

export default async function CoursesListingPage() {
  const courses = await prisma.course.findMany({
    where: { isPublished: true },
    include: {
      author: true,
      modules: {
        include: { sessions: true }
      }
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 w-full">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
          Explore Courses
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-400">
          Discover professional courses to advance your career.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {courses.map((course) => {
          const totalSessions = course.modules.reduce((acc, mod) => acc + mod.sessions.length, 0);

          return (
            <Link 
              key={course.id} 
              href={`/courses/${course.id}`}
              className="group block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300"
            >
              {/* Thumbnail Placeholder */}
              <div className="h-48 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {course.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2 mb-6">
                  {course.description}
                </p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                      {course.author.name?.charAt(0) || "U"}
                    </div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {course.author.name}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {totalSessions} Sessions
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {courses.length === 0 && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No courses available</h3>
            <p className="text-slate-500 dark:text-slate-400">Check back later or sign in to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
