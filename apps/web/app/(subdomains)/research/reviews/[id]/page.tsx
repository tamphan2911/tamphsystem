import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Hash,
  Mail,
  PauseCircle,
  PencilLine,
  Send,
  XCircle,
} from "lucide-react";
import { prisma, ResearchTaskStatus, Role } from "@repo/db";
import { auth } from "../../../../../auth";
import { formatMoney } from "../../lib/currency";
import { countryFlag, countryName } from "../../lib/countries";

export const dynamic = "force-dynamic";

function shortDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(value);
}

function statusLabel(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "ON_HOLD") return "On hold";
  return status
    .toLowerCase()
    .replace("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function statusMeta(status: string) {
  if (status === "ACCEPTED") {
    return {
      icon: CheckCircle2,
      className:
        "bg-purple-50 text-purple-700 ring-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:ring-purple-900",
    };
  }
  if (status === "IN_PROGRESS") {
    return {
      icon: PencilLine,
      className:
        "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
    };
  }
  if (status === "ON_HOLD") {
    return {
      icon: PauseCircle,
      className:
        "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    };
  }
  if (status === "SUBMITTED") {
    return {
      icon: Send,
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    };
  }
  if (status === "DECLINED") {
    return {
      icon: Ban,
      className:
        "bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    };
  }
  if (status === "CANCELLED") {
    return {
      icon: XCircle,
      className:
        "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    };
  }
  return {
    icon: Mail,
    className:
      "bg-slate-50 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  };
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-700 dark:text-slate-300">
        {value === null || value === undefined || value === "" ? "-" : value}
      </dd>
    </div>
  );
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!userId) redirect("/login");
  const isAdmin = roles.includes(Role.ADMIN);
  const review = await prisma.academicReview.findUnique({
    where: { id },
    include: {
      journal: {
        include: {
          _count: { select: { submissions: true, reviews: true } },
        },
      },
      tasks: {
        where: {
          status: {
            notIn: [ResearchTaskStatus.COMPLETED, ResearchTaskStatus.REVOKED],
          },
          assignments: { some: { userId } },
        },
        select: { id: true },
      },
    },
  });

  if (!review) notFound();
  if (!isAdmin && review.tasks.length === 0) redirect("/401");

  const status = statusMeta(review.status);
  const StatusIcon = status.icon;
  const journalFields =
    review.journal.fields.length > 0
      ? review.journal.fields
      : review.journal.field
        ? review.journal.field
            .split(";")
            .map((field) => field.trim())
            .filter(Boolean)
        : [];
  const externalLinks = [
    { href: review.journal.homepageLink, label: "Homepage" },
    { href: review.journal.submissionLink, label: "Submission portal" },
    { href: review.journal.scimagoLink, label: "Scimago" },
    { href: review.journal.scopusLink, label: "Scopus" },
  ].filter((item) => Boolean(item.href));

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Link
        href="/reviews"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300"
      >
        <ArrowLeft className="h-4 w-4" />
        Reviews
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
                {review.manuscriptId || review.id.slice(0, 8).toUpperCase()}
              </p>
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ${status.className}`}
              >
                <StatusIcon className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-medium leading-tight text-slate-950 dark:text-white">
              {review.manuscriptTitle}
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
              {statusLabel(review.status)}
              {review.reviewRound ? ` - ${review.reviewRound}` : ""}
            </p>
          </div>
          <div className="flex flex-none items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            <span>Due {shortDate(review.dueDate)}</span>
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          Review information
        </h2>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <DetailItem label="Status" value={statusLabel(review.status)} />
          <DetailItem
            label="Requested date"
            value={shortDate(review.requestedAt)}
          />
          <DetailItem label="Due date" value={shortDate(review.dueDate)} />
          <DetailItem
            label="Completed date"
            value={shortDate(review.completedAt)}
          />
          <DetailItem label="Review round" value={review.reviewRound || "-"} />
          <DetailItem
            label="Recommendation"
            value={review.recommendation || "-"}
          />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">
              Journal
            </h2>
            <Link
              href={`/journals/${review.journal.id}`}
              className="mt-3 inline-flex text-base font-semibold text-slate-800 transition hover:text-blue-600 dark:text-slate-100 dark:hover:text-blue-300"
            >
              {review.journal.name}
            </Link>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {review.journal.publisher || "No publisher"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {externalLinks.map((item) => (
              <a
                key={item.label}
                href={item.href as string}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-600 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-100 hover:shadow-md dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {item.label}
              </a>
            ))}
          </div>
        </div>
        <dl className="mt-4 grid gap-4 md:grid-cols-4">
          <DetailItem label="ISSN" value={review.journal.issn || "-"} />
          <DetailItem label="Rank" value={review.journal.rank || "-"} />
          <DetailItem
            label="Country"
            value={
              review.journal.country ? (
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true">
                    {countryFlag(review.journal.country)}
                  </span>
                  <span>{countryName(review.journal.country)}</span>
                </span>
              ) : (
                "-"
              )
            }
          />
          <DetailItem
            label="Field"
            value={journalFields.length > 0 ? journalFields.join("; ") : "-"}
          />
          <DetailItem
            label="APC"
            value={formatMoney(review.journal.apc, review.journal.apcCurrency)}
          />
          <DetailItem
            label="Submission fee"
            value={formatMoney(
              review.journal.submissionFee,
              review.journal.submissionFeeCurrency,
            )}
          />
          <DetailItem
            label="Submissions"
            value={review.journal._count.submissions}
          />
          <DetailItem label="Reviews" value={review.journal._count.reviews} />
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-base font-semibold text-slate-950 dark:text-white">
          Notes
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              <Hash className="h-3.5 w-3.5 text-amber-500" />
              Private note
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {review.note || "-"}
            </p>
          </div>
          {review.editorName && (
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Editor
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {review.editorName}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
