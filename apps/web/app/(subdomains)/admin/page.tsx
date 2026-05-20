import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalUsers, totalCourses, totalProjects] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.researchProject.count(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat Card 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-2">Total Users</h3>
          <p className="text-4xl font-bold text-slate-900 dark:text-white">{totalUsers}</p>
        </div>
        
        {/* Stat Card 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-2">Active Courses</h3>
          <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{totalCourses}</p>
        </div>
        
        {/* Stat Card 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-slate-500 dark:text-slate-400 font-medium mb-2">Research Projects</h3>
          <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{totalProjects}</p>
        </div>
      </div>
    </div>
  );
}
