import Link from "next/link";
import { ExternalLink, GraduationCap, PlusCircle } from "lucide-react";
import { prisma } from "@repo/db";
import { createCourse, updateCoursePublishing } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const [courses, authors] = await Promise.all([
    prisma.course.findMany({
      include: {
        author: true,
        _count: { select: { modules: true, enrollments: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { roles: { hasSome: ["ADMIN", "LECTURER"] } },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">
          <GraduationCap className="h-8 w-8 text-blue-600" />
          Learn Courses
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Create courses and control whether they are visible on the Learn domain.
        </p>
      </div>

      <form action={createCourse} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          New course
        </h2>
        <div className="grid gap-3 lg:grid-cols-4">
          <input name="title" required placeholder="Course title" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950" />
          <input name="description" placeholder="Description" className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 lg:col-span-2" />
          <select name="authorId" required className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950">
            <option value="">Author</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>{author.name || author.email}</option>
            ))}
          </select>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" />
          Publish immediately
        </label>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
          Create Course
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              <th className="sticky left-0 z-20 bg-slate-50 px-5 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800">Course</th>
              <th className="px-5 py-3">Author</th>
              <th className="px-5 py-3">Modules</th>
              <th className="px-5 py-3">Enrollments</th>
              <th className="px-5 py-3">Published</th>
              <th className="px-5 py-3">Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {courses.map((course) => (
              <tr key={course.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="sticky left-0 z-10 bg-white px-5 py-4 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800">
                  <p className="font-semibold">{course.title}</p>
                  <p className="mt-1 max-w-xl text-sm text-slate-500">{course.description || "-"}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500">{course.author.name || course.author.email}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{course._count.modules}</td>
                <td className="px-5 py-4 text-sm text-slate-500">{course._count.enrollments}</td>
                <td className="px-5 py-4">
                  <form action={updateCoursePublishing} className="flex items-center gap-2">
                    <input type="hidden" name="courseId" value={course.id} />
                    <input type="checkbox" name="isPublished" defaultChecked={course.isPublished} />
                    <button className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">
                      Save
                    </button>
                  </form>
                </td>
                <td className="px-5 py-4">
                  <Link href={`https://learn.tamph.com/courses/${course.id}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600">
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
