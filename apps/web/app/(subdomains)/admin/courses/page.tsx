import { Fragment } from "react";
import Link from "next/link";
import { ExternalLink, GraduationCap, PlusCircle } from "lucide-react";
import { prisma } from "@repo/db";
import {
  createModule,
  createQuizQuestion,
  createCourse,
  createSession,
  updateAdminSessionContent,
  updateCoursePublishing,
} from "../actions";

const sessionTypes = [
  "LESSON_TEXT",
  "LESSON_VIDEO",
  "EXERCISE_QUIZ",
  "EXERCISE_ESSAY",
  "EXERCISE_CODING",
];

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const [courses, authors] = await Promise.all([
    prisma.course.findMany({
      include: {
        author: true,
        modules: {
          orderBy: { order: "asc" },
          include: {
            sessions: {
              orderBy: { order: "asc" },
              include: {
                quiz: {
                  include: {
                    questions: { include: { answers: true } },
                  },
                },
              },
            },
          },
        },
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
          Create courses and control whether they are visible on the Learn
          domain.
        </p>
      </div>

      <form
        action={createCourse}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
      >
        <h2 className="mb-4 flex items-center gap-2 font-bold">
          <PlusCircle className="h-4 w-4 text-blue-600" />
          New course
        </h2>
        <div className="grid gap-3 lg:grid-cols-4">
          <input
            name="title"
            required
            placeholder="Course title"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            name="description"
            placeholder="Description"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 lg:col-span-2"
          />
          <select
            name="authorId"
            required
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Author</option>
            {authors.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name || author.email}
              </option>
            ))}
          </select>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" name="isPublished" />
          Publish immediately
        </label>
        <button className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md dark:bg-blue-500 dark:hover:bg-blue-400">
          Create Course
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-left">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="sticky left-0 z-20 bg-slate-50 px-5 py-3 shadow-[1px_0_0_0_rgb(226,232,240)] dark:bg-slate-800">
                  Course
                </th>
                <th className="px-5 py-3">Author</th>
                <th className="px-5 py-3">Modules</th>
                <th className="px-5 py-3">Enrollments</th>
                <th className="px-5 py-3">Published</th>
                <th className="px-5 py-3">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {courses.map((course) => (
                <Fragment key={course.id}>
                  <tr
                    key={course.id}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="sticky left-0 z-10 bg-white px-5 py-4 shadow-[1px_0_0_0_rgb(226,232,240)] transition-colors group-hover:bg-slate-50 dark:bg-slate-900 dark:group-hover:bg-slate-800">
                      <p className="font-semibold">{course.title}</p>
                      <p className="mt-1 max-w-xl text-sm text-slate-500">
                        {course.description || "-"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {course.author.name || course.author.email}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {course._count.modules}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {course._count.enrollments}
                    </td>
                    <td className="px-5 py-4">
                      <form
                        action={updateCoursePublishing}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="courseId"
                          value={course.id}
                        />
                        <input
                          type="checkbox"
                          name="isPublished"
                          defaultChecked={course.isPublished}
                        />
                        <button className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`https://learn.tamph.com/courses/${course.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600"
                      >
                        Open <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                  <tr key={`${course.id}-sessions`}>
                    <td
                      colSpan={6}
                      className="bg-slate-50/70 px-5 py-4 dark:bg-slate-950/40"
                    >
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Course builder
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              Add modules, sessions, lesson content, exercises,
                              and quiz questions.
                            </p>
                          </div>
                          <form
                            action={createModule}
                            className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-[1fr_5rem_auto]"
                          >
                            <input
                              type="hidden"
                              name="courseId"
                              value={course.id}
                            />
                            <input
                              name="title"
                              required
                              placeholder="New module title"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                            <input
                              name="order"
                              type="number"
                              min="1"
                              placeholder="Order"
                              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                            />
                            <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                              Add module
                            </button>
                          </form>
                        </div>

                        {course.modules.map((module) => (
                          <div
                            key={module.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"
                          >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                  Module {module.order}
                                </p>
                                <h3 className="font-semibold">
                                  {module.title}
                                </h3>
                              </div>
                              <form
                                action={createSession}
                                className="grid gap-2 lg:grid-cols-[1fr_10rem_5rem_auto]"
                              >
                                <input
                                  type="hidden"
                                  name="moduleId"
                                  value={module.id}
                                />
                                <input
                                  name="title"
                                  required
                                  placeholder="New session title"
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                />
                                <select
                                  name="type"
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                >
                                  {sessionTypes.map((type) => (
                                    <option key={type} value={type}>
                                      {type.replaceAll("_", " ").toLowerCase()}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  name="order"
                                  type="number"
                                  min="1"
                                  placeholder="Order"
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                />
                                <button className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                                  Add session
                                </button>
                              </form>
                            </div>

                            <div className="mt-4 space-y-3">
                              {module.sessions.map((session) => (
                            <form
                              key={session.id}
                              action={updateAdminSessionContent}
                              className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_8rem]"
                            >
                              <input
                                type="hidden"
                                name="sessionId"
                                value={session.id}
                              />
                              <div className="grid gap-3 md:grid-cols-[1fr_11rem_8rem]">
                                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Title
                                  <input
                                    name="title"
                                    defaultValue={session.title}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  />
                                </label>
                                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Type
                                  <select
                                    name="type"
                                    defaultValue={session.type}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  >
                                    {sessionTypes.map((type) => (
                                      <option key={type} value={type}>
                                        {type
                                          .replaceAll("_", " ")
                                          .toLowerCase()}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Year
                                  <input
                                    name="year"
                                    type="number"
                                    min="1900"
                                    max="2100"
                                    defaultValue={session.year ?? ""}
                                    placeholder="2026"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  />
                                </label>
                              </div>
                              <div className="text-xs text-slate-500 lg:text-right">
                                <p className="font-semibold text-slate-700 dark:text-slate-200">
                                  {module.title}
                                </p>
                                <p>
                                  {session.type
                                    .replaceAll("_", " ")
                                    .toLowerCase()}
                                </p>
                              </div>
                              <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400 lg:col-span-2">
                                Content
                                <textarea
                                  name="content"
                                  defaultValue={session.content ?? ""}
                                  rows={4}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                />
                              </label>
                              <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
                                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Video URL
                                  <input
                                    name="videoUrl"
                                    defaultValue={session.videoUrl ?? ""}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  />
                                </label>
                                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Coding language
                                  <input
                                    name="codingLanguage"
                                    defaultValue={session.codingLanguage ?? ""}
                                    placeholder="python"
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  />
                                </label>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 lg:col-span-2">
                                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Initial code
                                  <textarea
                                    name="initialCode"
                                    defaultValue={session.initialCode ?? ""}
                                    rows={3}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  />
                                </label>
                                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                                  Expected output
                                  <textarea
                                    name="expectedOutput"
                                    defaultValue={session.expectedOutput ?? ""}
                                    rows={3}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs normal-case tracking-normal text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                                  />
                                </label>
                              </div>
                              <div className="lg:col-span-2">
                                <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                                  Save session
                                </button>
                              </div>
                            </form>
                              ))}

                              {module.sessions
                                .filter(
                                  (session) =>
                                    session.type === "EXERCISE_QUIZ",
                                )
                                .map((session) => (
                                  <form
                                    key={`${session.id}-question`}
                                    action={createQuizQuestion}
                                    className="grid gap-3 rounded-lg border border-dashed border-purple-200 bg-purple-50/40 p-4 dark:border-purple-900/60 dark:bg-purple-950/20"
                                  >
                                    <input
                                      type="hidden"
                                      name="sessionId"
                                      value={session.id}
                                    />
                                    <div>
                                      <p className="text-xs font-bold uppercase tracking-wide text-purple-700 dark:text-purple-300">
                                        Quiz questions for {session.title}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500">
                                        Existing questions:{" "}
                                        {session.quiz?.questions.length ?? 0}
                                      </p>
                                    </div>
                                    <input
                                      name="text"
                                      required
                                      placeholder="Question"
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                    />
                                    <div className="grid gap-2 md:grid-cols-2">
                                      {["answerA", "answerB", "answerC", "answerD"].map(
                                        (name, index) => (
                                          <input
                                            key={name}
                                            name={name}
                                            required={index < 2}
                                            placeholder={`Answer ${index + 1}`}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                          />
                                        ),
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                      <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                                        Correct answer
                                      </label>
                                      <select
                                        name="correctIndex"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                                      >
                                        <option value="0">Answer 1</option>
                                        <option value="1">Answer 2</option>
                                        <option value="2">Answer 3</option>
                                        <option value="3">Answer 4</option>
                                      </select>
                                      <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700">
                                        Add question
                                      </button>
                                    </div>
                                  </form>
                                ))}

                              {module.sessions.length === 0 && (
                                <p className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
                                  No sessions in this module yet.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}

                        {course.modules.length === 0 && (
                          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-slate-700">
                            No modules in this course yet.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
