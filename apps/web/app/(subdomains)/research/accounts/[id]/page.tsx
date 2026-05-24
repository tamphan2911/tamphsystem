import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  AtSign,
  BookOpen,
  ClipboardList,
  Hash,
  KeyRound,
  LockKeyhole,
  Send,
  StickyNote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { prisma } from "@repo/db";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
        {value || "-"}
      </p>
    </div>
  );
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const account = await prisma.publisherAccount.findUnique({
    where: { id },
    include: {
      journal: true,
      submissions: {
        include: { project: true },
        orderBy: { submittedAt: "desc" },
      },
      tasks: {
        include: { project: true },
        orderBy: [{ createdAt: "desc" }],
      },
    },
  });

  if (!account) notFound();

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Link
        href="/accounts"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Accounts
      </Link>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
              Site ID: {account.id}
            </p>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
              <KeyRound className="h-5 w-5 text-amber-500" />
              {account.username}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {account.journal ? (
                <Link
                  href={`/journals/${account.journal.id}`}
                  className="font-semibold text-slate-600 transition hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-300"
                >
                  {account.journal.name}
                </Link>
              ) : (
                "Publisher-wide account"
              )}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InfoTile icon={Send} label="Submissions" value={String(account.submissions.length)} />
            <InfoTile icon={ClipboardList} label="Tasks" value={String(account.tasks.length)} />
            <InfoTile icon={BookOpen} label="Scope" value={account.journal ? "Journal" : "Publisher"} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <InfoTile icon={Hash} label="Site ID" value={account.id} />
        <InfoTile icon={KeyRound} label="Login ID" value={account.username} />
        <InfoTile icon={LockKeyhole} label="Password" value={account.password} />
        <InfoTile icon={AtSign} label="Email" value={account.email ?? ""} />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-black text-slate-950 dark:text-white">
          <StickyNote className="h-4 w-4 text-slate-400" />
          Notes
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
          {account.note || "No note recorded."}
        </p>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-950 dark:text-white">
            Submissions
          </h2>
        </div>
        <table className="w-full table-fixed text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Research</th>
              <th className="w-36 px-3 py-3">Status</th>
              <th className="w-32 px-3 py-3">Submitted</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {account.submissions.map((submission) => (
              <tr
                key={submission.id}
                className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/projects/${submission.project.id}`}
                    className="line-clamp-1 font-semibold text-slate-800 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-300"
                  >
                    {submission.project.title}
                  </Link>
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    {submission.submissionCode || submission.id.slice(0, 8).toUpperCase()}
                  </p>
                </td>
                <td className="px-3 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {submission.status.replace("_", " ")}
                </td>
                <td className="px-3 py-3 text-sm text-slate-600 dark:text-slate-300">
                  {shortDate(submission.submittedAt)}
                </td>
              </tr>
            ))}
            {account.submissions.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  No submissions use this account yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
