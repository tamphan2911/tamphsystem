export default async function CoursesSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const query = (await searchParams).q || "";

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 w-full flex-1">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          {query ? `Search results for "${query}"` : "All Courses"}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Explore our catalog of professional courses.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Search Successful</h3>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          You searched for <strong className="text-slate-900 dark:text-white">"{query}"</strong>.
          <br /><br />
          This is a placeholder page. We haven't built the course database fetching logic yet! Next, we should connect this to the Prisma database.
        </p>
      </div>
    </div>
  );
}
