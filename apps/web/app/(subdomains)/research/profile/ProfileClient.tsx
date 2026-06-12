"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  FileText,
  Mail,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { updateResearchProfile } from "./actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  IconHint,
  ResearchButton,
  researchFieldClass,
} from "@/sites/research/components/ResearchPrimitives";
import {
  ResearchProjectsTable,
  type ResearchProjectRow,
} from "../projects/ResearchProjectsTable";
import {
  OrganizedProjectsTable,
  type OrganizedProjectRow,
} from "../organized-projects/OrganizedProjectsTable";
import { ProposalsTable, type ProposalRow } from "../proposals/ProposalsTable";

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

type ProfileTaskRow = {
  id: string;
  title: string;
  status: string;
  taskType: string;
  dueDate: string | null;
  completedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TabKey = "dashboard" | "research" | "projects" | "proposals";
type PeriodKey = "all" | "last" | "current";

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function periodLabel(period: PeriodKey) {
  if (period === "current") return "This month";
  if (period === "last") return "Last month";
  return "All time";
}

function periodStart(period: PeriodKey) {
  const now = new Date();
  if (period === "current") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === "last") {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  return null;
}

function periodEnd(period: PeriodKey) {
  const now = new Date();
  if (period === "last") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

function taskTypeLabel(value: string) {
  return value
    .replace("SUBMIT_RESEARCH", "SUBMITTING")
    .replace("PROJECT_PRODUCTION", "PROJECT")
    .replace("PROJECT_RESEARCH_ASSOCIATED", "RESEARCH ASSOCIATED")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isTaskInPeriod(task: ProfileTaskRow, period: PeriodKey) {
  const start = periodStart(period);
  const end = periodEnd(period);
  if (!start) return true;
  const date = new Date(task.completedAt ?? task.finishedAt ?? task.updatedAt);
  if (date < start) return false;
  if (end && date >= end) return false;
  return true;
}

function isOverdue(task: ProfileTaskRow) {
  if (
    !task.dueDate ||
    task.status === "COMPLETE" ||
    task.status === "REVOKED"
  ) {
    return false;
  }
  return new Date(task.dueDate).getTime() < Date.now();
}

function statusMetric(tasks: ProfileTaskRow[]) {
  return [
    {
      label: "Completed",
      value: tasks.filter((task) => task.status === "COMPLETE").length,
      className: "bg-[#A8DADC]",
    },
    {
      label: "Checking",
      value: tasks.filter((task) => task.status === "CHECKING").length,
      className: "bg-[#B39CD0]",
    },
    {
      label: "Active",
      value: tasks.filter(
        (task) =>
          task.status !== "COMPLETE" &&
          task.status !== "REVOKED" &&
          task.status !== "CHECKING",
      ).length,
      className: "bg-[#FFC1CC]",
    },
    {
      label: "Overdue",
      value: tasks.filter(isOverdue).length,
      className: "bg-rose-300",
    },
  ];
}

function typeMetric(tasks: ProfileTaskRow[]) {
  const labels = new Map<string, number>();
  tasks.forEach((task) => {
    const label = taskTypeLabel(task.taskType || "OTHER");
    labels.set(label, (labels.get(label) ?? 0) + 1);
  });
  return Array.from(labels.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value], index) => ({
      label,
      value,
      className:
        index % 3 === 0
          ? "bg-[#A8DADC]"
          : index % 3 === 1
            ? "bg-[#B39CD0]"
            : "bg-[#FFC1CC]",
    }));
}

export function ProfileClient({
  user,
  researchRows,
  projectRows,
  proposalRows,
  taskRows,
  isAssistant,
}: {
  user: ResearchProfileUser;
  researchRows: ResearchProjectRow[];
  projectRows: OrganizedProjectRow[];
  proposalRows: ProposalRow[];
  taskRows: ProfileTaskRow[];
  isAssistant: boolean;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [editOpen, setEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>(
    isAssistant ? "dashboard" : "research",
  );
  const [period, setPeriod] = useState<PeriodKey>("all");

  async function saveProfile(formData: FormData) {
    setIsSaving(true);
    const result = await updateResearchProfile(formData);
    setIsSaving(false);
    if (result.error) {
      toast.showError({
        title: "Profile update failed",
        detail: result.error,
      });
      return;
    }
    setEditOpen(false);
    router.refresh();
    toast.showSuccess({
      title: "Profile updated",
      detail: "Your research profile information has been saved.",
    });
  }

  const roleText = user.roles.map(roleLabel).join(", ") || "Research user";
  const stats = [
    {
      label: "Lead",
      value: user._count.researchProjects,
      icon: BriefcaseBusiness,
      hint: "Research records where this user is the lead researcher.",
    },
    {
      label: "Author",
      value: user._count.authoredResearch,
      icon: FileText,
      hint: "Research records where this user is listed as an author.",
    },
    {
      label: "Reg.",
      value: user._count.registeredResearch,
      icon: BadgeCheck,
      hint: "Research records registered under this user.",
    },
    {
      label: "Tasks",
      value: user._count.assignedResearchTasks,
      icon: ClipboardList,
      hint: "Research tasks assigned to this user.",
    },
  ];
  const tabs = [
    ...(isAssistant
      ? [
          {
            key: "dashboard" as const,
            label: "Dashboard",
            value: taskRows.length,
            icon: BarChart3,
          },
        ]
      : []),
    {
      key: "research" as const,
      label: "Research",
      value: researchRows.length,
      icon: FileText,
    },
    {
      key: "projects" as const,
      label: "Projects",
      value: projectRows.length,
      icon: BriefcaseBusiness,
    },
    {
      key: "proposals" as const,
      label: "Proposals",
      value: proposalRows.length,
      icon: ClipboardList,
    },
  ];

  const periodTasks = useMemo(
    () => taskRows.filter((task) => isTaskInPeriod(task, period)),
    [period, taskRows],
  );
  const statusBars = statusMetric(periodTasks);
  const typeBars = typeMetric(periodTasks);
  const maxStatus = Math.max(1, ...statusBars.map((item) => item.value));
  const maxType = Math.max(1, ...typeBars.map((item) => item.value));
  const completionRate =
    periodTasks.length === 0
      ? 0
      : Math.round(
          (periodTasks.filter((task) => task.status === "COMPLETE").length /
            periodTasks.length) *
            100,
        );

  return (
    <>
      <ResearchPageHeaderPortal>
        <div className="flex w-full min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-base font-normal text-[#E4E4E4]">
                {user.name || "Research user"}
              </h1>
              {user.emailVerified && (
                <IconHint label="Email verified">
                  <span className="inline-flex cursor-help text-[#A8DADC] transition duration-200 ease-out hover:-translate-y-0.5 hover:text-[#C9F0F2]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Email verified</span>
                  </span>
                </IconHint>
              )}
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex cursor-pointer border-0 bg-transparent p-1 text-[#B0B0B0] transition duration-200 ease-out hover:-translate-y-0.5 hover:text-[#A8DADC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A8DADC]/35"
                aria-label="Edit profile"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#B0B0B0]">
              {user.email && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Mail className="h-3.5 w-3.5 flex-none" />
                  <span className="truncate">{user.email}</span>
                </span>
              )}
              {user.email && <span className="text-[#666666]">|</span>}
              <span className="truncate">{roleText}</span>
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid grid-cols-2 border border-[#444444] bg-[#2C2C2C] sm:grid-cols-4">
          {stats.map((item, index) => (
            <IconHint key={item.label} label={item.hint}>
              <div
                className={`flex cursor-help items-center justify-between gap-3 px-4 py-3 transition duration-200 ease-out hover:bg-[#383838] ${
                  index > 0 ? "sm:border-l sm:border-[#444444]" : ""
                } ${index % 2 === 1 ? "border-l border-[#444444] sm:border-l" : ""} ${
                  index > 1 ? "border-t border-[#444444] sm:border-t-0" : ""
                }`}
              >
                <div>
                  <p className="text-[11px] font-normal uppercase tracking-wide text-[#B0B0B0]">
                    {item.label}
                  </p>
                  <p className="mt-1 text-xl font-normal text-[#E4E4E4]">
                    {item.value}
                  </p>
                </div>
                <item.icon className="h-5 w-5 text-[#A8DADC]" />
              </div>
            </IconHint>
          ))}
        </div>

        {user.affiliation && (
          <p className="border-b border-[#444444] pb-3 text-sm leading-6 text-[#B0B0B0]">
            {user.affiliation}
          </p>
        )}

        <section className="space-y-3">
          <div
            className={`journal-detail-tabs grid w-full border border-[#444444] bg-[#242424] p-1 text-center ${
              isAssistant ? "grid-cols-4" : "grid-cols-3"
            }`}
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                data-active={activeTab === tab.key}
                aria-pressed={activeTab === tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="journal-detail-tab-button cursor-pointer rounded-none px-4 py-3 text-left"
              >
                <span className="relative z-10 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[11px] font-normal uppercase tracking-wide">
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </span>
                  <span className="text-base font-normal">{tab.value}</span>
                </span>
              </button>
            ))}
          </div>

          {activeTab === "dashboard" && isAssistant && (
            <AssistantDashboard
              period={period}
              onPeriodChange={setPeriod}
              total={periodTasks.length}
              completionRate={completionRate}
              statusBars={statusBars}
              typeBars={typeBars}
              maxStatus={maxStatus}
              maxType={maxType}
            />
          )}

          {activeTab === "research" && (
            <ResearchProjectsTable
              rows={researchRows}
              isAdmin={false}
              showClaimRegistration
              emptyMessage="No authored research is linked to this account."
            />
          )}

          {activeTab === "projects" && (
            <OrganizedProjectsTable
              rows={projectRows}
              isAdmin={false}
              emptyMessage="No organized projects are linked to this account."
            />
          )}

          {activeTab === "proposals" && (
            <ProposalsTable rows={proposalRows} isAdmin={false} />
          )}
        </section>
      </div>

      <ResearchModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Profile"
        icon={<UserRound className="h-5 w-5" />}
        maxWidth="max-w-2xl"
        headerActions={
          <ResearchButton form="profile-edit-form" disabled={isSaving}>
            {isSaving ? (
              <Check className="h-4 w-4" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save changes"}
          </ResearchButton>
        }
      >
        <form
          id="profile-edit-form"
          action={saveProfile}
          className="grid gap-5"
        >
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              Display name
              <span className="research-required-mark">(*)</span>
            </span>
            <input
              name="name"
              defaultValue={user.name ?? ""}
              required
              className={researchFieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              Affiliation
              <span className="research-required-mark">(*)</span>
            </span>
            <input
              name="affiliation"
              defaultValue={user.affiliation}
              required
              className={researchFieldClass}
            />
          </label>
        </form>
      </ResearchModal>
    </>
  );
}

function AssistantDashboard({
  period,
  onPeriodChange,
  total,
  completionRate,
  statusBars,
  typeBars,
  maxStatus,
  maxType,
}: {
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  total: number;
  completionRate: number;
  statusBars: { label: string; value: number; className: string }[];
  typeBars: { label: string; value: number; className: string }[];
  maxStatus: number;
  maxType: number;
}) {
  return (
    <div className="border border-[#444444] bg-[#2C2C2C]">
      <div className="flex flex-col gap-3 border-b border-[#444444] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
            Assistant Performance
          </p>
          <p className="mt-1 text-sm text-[#E4E4E4]">
            {total} task{total === 1 ? "" : "s"} tracked - {completionRate}%
            completion rate
          </p>
        </div>
        <div className="grid grid-cols-3 border border-[#444444] bg-[#242424] p-1">
          {(["all", "last", "current"] as PeriodKey[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onPeriodChange(item)}
              className={`cursor-pointer px-3 py-2 text-xs font-normal uppercase tracking-wide transition duration-200 ease-out ${
                period === item
                  ? "bg-[#A8DADC] text-[#202020]"
                  : "text-[#B0B0B0] hover:bg-[#383838] hover:text-[#E4E4E4]"
              }`}
            >
              {periodLabel(item)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="border-b border-[#444444] p-4 lg:border-b-0 lg:border-r">
          <p className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
            Task Status
          </p>
          <div className="mt-4 grid gap-3">
            {statusBars.map((item) => (
              <BarRow key={item.label} item={item} max={maxStatus} />
            ))}
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
            Work Mix
          </p>
          <div className="mt-4 grid gap-3">
            {typeBars.length > 0 ? (
              typeBars.map((item) => (
                <BarRow key={item.label} item={item} max={maxType} compact />
              ))
            ) : (
              <p className="border border-[#444444] bg-[#242424] px-3 py-6 text-center text-sm text-[#B0B0B0]">
                No task data in this period.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarRow({
  item,
  max,
  compact = false,
}: {
  item: { label: string; value: number; className: string };
  max: number;
  compact?: boolean;
}) {
  const width = `${Math.max(6, Math.round((item.value / max) * 100))}%`;
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-normal uppercase tracking-wide text-[#B0B0B0]">
          {item.label}
        </span>
        <span className="font-mono text-[#E4E4E4]">{item.value}</span>
      </div>
      <div
        className={`${compact ? "h-2" : "h-3"} border border-[#444444] bg-[#242424]`}
      >
        <div
          className={`h-full transition-all duration-500 ease-out ${item.className}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}
