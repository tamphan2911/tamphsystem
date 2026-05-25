"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  FileText,
  Mail,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { updateResearchProfile } from "./actions";

type ResearchProfileUser = {
  id: string;
  name: string | null;
  email: string;
  affiliation: string;
  emailVerified: string | null;
  roles: string[];
  createdAt: string;
  _count: {
    researchProjects: number;
    authoredResearch: number;
    registeredResearch: number;
    assignedResearchTasks: number;
  };
};

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string | null, email: string) {
  const source = name || email;
  return source
    .split(/[.\s@_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileClient({ user }: { user: ResearchProfileUser }) {
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleUpdate(formData: FormData) {
    setIsPending(true);
    setMessage(null);
    const result = await updateResearchProfile(formData);
    setIsPending(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }

    setMessage({
      type: "success",
      text: "Research profile updated successfully.",
    });
  }

  const activity = [
    {
      label: "Lead projects",
      value: user._count.researchProjects,
      icon: BriefcaseBusiness,
      tone: "bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    },
    {
      label: "Author records",
      value: user._count.authoredResearch,
      icon: FileText,
      tone: "bg-blue-50 text-blue-700 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
    },
    {
      label: "Registration owner",
      value: user._count.registeredResearch,
      icon: BadgeCheck,
      tone: "bg-violet-50 text-violet-700 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
    },
    {
      label: "Assigned tasks",
      value: user._count.assignedResearchTasks,
      icon: ClipboardList,
      tone: "bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
          <div className="relative min-h-[18rem] overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.24),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.26),transparent_30%)]" />
            <div className="relative flex h-full flex-col justify-between gap-8">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-100">
                <Sparkles className="h-3.5 w-3.5" />
                Research identity
              </div>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-3xl font-black shadow-2xl backdrop-blur">
                  {initials(user.name, user.email)}
                </div>
                <div className="min-w-0">
                  <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                    {user.name || "Research user"}
                  </h1>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-300">
                    <Mail className="h-4 w-4 text-emerald-200" />
                    {user.email}
                    {user.emailVerified && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid content-between gap-5 border-t border-slate-200 p-6 dark:border-slate-800 lg:border-l lg:border-t-0">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Research roles
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700"
                  >
                    {roleLabel(role)}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Account started
              </p>
              <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                {new Intl.DateTimeFormat("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(new Date(user.createdAt))}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {activity.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <span
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 ${item.tone}`}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <p className="mt-4 text-2xl font-black text-slate-950 dark:text-white">
              {item.value}
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {item.label}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
            <UserRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-white">
              Research profile details
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Shared account information, presented for research operations.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <form action={handleUpdate} className="grid gap-5 lg:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Display name
            </span>
            <input
              name="name"
              defaultValue={user.name ?? ""}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-700"
              required
            />
          </label>
          <label className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Email address
            </span>
            <input
              value={user.email}
              disabled
              className="cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400"
            />
          </label>
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Affiliation
            </span>
            <input
              name="affiliation"
              defaultValue={user.affiliation}
              className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-emerald-700"
              required
            />
          </label>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-md disabled:cursor-wait disabled:opacity-70"
            >
              {isPending ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isPending ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
