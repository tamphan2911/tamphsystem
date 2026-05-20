import Link from "next/link";
import { ArrowUpRight, BookOpen, FolderGit2, GraduationCap, KeyRound, Library, Users } from "lucide-react";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

const cards = [
  { href: "/users", label: "Users & Roles", description: "Create accounts and assign admin, lecturer, student, researcher, assistant roles.", icon: Users },
  { href: "/courses", label: "Learn Courses", description: "Review course publishing status, modules, sessions, and authors.", icon: GraduationCap },
  { href: "/research", label: "Research Projects", description: "Control research stages, claim status, registrations, submissions, and publications.", icon: FolderGit2 },
  { href: "/journals", label: "Journals", description: "Manage journal database, publishers, ranks, APCs, fees, and notes.", icon: BookOpen },
  { href: "/accounts", label: "Publisher Accounts", description: "Store journal and publisher login credentials used for submissions.", icon: KeyRound },
];

export default async function AdminDashboard() {
  const [
    totalUsers,
    totalCourses,
    publishedCourses,
    totalProjects,
    submittingProjects,
    totalJournals,
    totalAccounts,
    publications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.researchProject.count(),
    prisma.researchProject.count({ where: { stage: "SUBMITTING" } }),
    prisma.journal.count(),
    prisma.publisherAccount.count(),
    prisma.publication.count(),
  ]);

  const stats = [
    { label: "Users", value: totalUsers, tone: "text-slate-950 dark:text-white" },
    { label: "Published courses", value: `${publishedCourses}/${totalCourses}`, tone: "text-blue-600" },
    { label: "Research projects", value: totalProjects, tone: "text-emerald-600" },
    { label: "Submitting", value: submittingProjects, tone: "text-amber-600" },
    { label: "Journals", value: totalJournals, tone: "text-purple-600" },
    { label: "Accounts", value: totalAccounts, tone: "text-slate-950 dark:text-white" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Overview</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Manage the public portfolio, Learn domain, Research domain, users, roles, journals, accounts, and publication operations from one place.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{stat.label}</p>
            <p className={`mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="font-bold">{card.label}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{card.description}</p>
                  </div>
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-400 transition group-hover:text-blue-600" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-2 font-bold">
          <Library className="h-5 w-5 text-emerald-600" />
          Publication state
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {publications} publication records are currently stored in the research system.
        </p>
      </div>
    </div>
  );
}
