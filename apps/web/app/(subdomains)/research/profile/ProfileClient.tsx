"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  FileText,
  Mail,
  Pencil,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { updateResearchProfile } from "./actions";
import {
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";

type ResearchProfileUser = {
  id: string;
  name: string | null;
  email: string;
  affiliation: string;
  avatarUrl: string | null;
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

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ProfileClient({ user }: { user: ResearchProfileUser }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function saveProfile(formData: FormData) {
    setIsSaving(true);
    setMessage(null);
    const result = await updateResearchProfile(formData);
    setIsSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      return;
    }
    setEditOpen(false);
    router.refresh();
    setMessage({ type: "success", text: "Profile information updated." });
  }

  const stats = [
    {
      label: "Lead",
      value: user._count.researchProjects,
      icon: BriefcaseBusiness,
    },
    { label: "Author", value: user._count.authoredResearch, icon: FileText },
    { label: "Reg.", value: user._count.registeredResearch, icon: BadgeCheck },
    {
      label: "Tasks",
      value: user._count.assignedResearchTasks,
      icon: ClipboardList,
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {message && (
        <div
          className={`rounded-none border px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="border border-[#444444] bg-[#2C2C2C] p-5 shadow-none">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-black text-[#E4E4E4]">
                  {user.name || "Research user"}
                </h1>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-[#444444] bg-slate-50 text-slate-500 transition hover:bg-white hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  aria-label="Edit profile information"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#B0B0B0]">
                <Mail className="h-4 w-4" />
                {user.email}
                {user.emailVerified && (
                  <span className="inline-flex items-center gap-1 rounded-none bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </p>
            </div>
            <div className="text-right text-xs font-semibold text-slate-400">
              Joined {shortDate(user.createdAt)}
            </div>
          </div>

          <dl className="mt-5 grid gap-3 md:grid-cols-2">
            <Info label="Affiliation" value={user.affiliation} />
            <Info label="Roles" value={user.roles.map(roleLabel).join(", ")} />
          </dl>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="border border-[#444444] bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <item.icon className="h-4 w-4 text-emerald-500" />
                <p className="mt-2 text-xl font-black text-[#E4E4E4]">
                  {item.value}
                </p>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {editOpen && (
        <div
          data-research-modal-overlay="true"
          className="fixed inset-0 z-[1010] flex overflow-y-auto items-center justify-center bg-slate-950/55 px-4 py-8 backdrop-blur-sm"
        >
          <form
            id="profile-edit-form"
            action={saveProfile}
            className="w-full max-w-lg overflow-hidden border border-[#444444] bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h2 className="text-lg font-black text-[#E4E4E4]">
                  Edit profile
                </h2>
                <p className="mt-1 text-sm text-[#B0B0B0]">
                  Update your research display name and affiliation.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ResearchButton form="profile-edit-form" disabled={isSaving}>
                  {isSaving ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                  {isSaving ? "Saving..." : "Save changes"}
                </ResearchButton>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="rounded-none p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 px-5 py-4">
              <label className="grid gap-1 text-sm font-semibold text-[#E4E4E4]">
                Display name
                <input
                  name="name"
                  defaultValue={user.name ?? ""}
                  required
                  className={researchFieldClass}
                />
              </label>
              <label className="grid gap-1 text-sm font-semibold text-[#E4E4E4]">
                Affiliation
                <input
                  name="affiliation"
                  defaultValue={user.affiliation}
                  required
                  className={researchFieldClass}
                />
              </label>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[#444444] bg-[#2C2C2C] px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-[#E4E4E4]">
        {value || "-"}
      </dd>
    </div>
  );
}
