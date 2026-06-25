"use client";

import {
  researchDateTimeFormat,
  researchStartOfDay,
  researchStartOfMonth,
  researchWeekday,
} from "@/sites/research/lib/date-time";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Check,
  ClipboardList,
  FileText,
  KeyRound,
  Mail,
  Pencil,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { updateResearchPassword, updateResearchProfile } from "./actions";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { ResearchModal } from "@/sites/research/components/ResearchModal";
import { ResearchFormSelect } from "@/sites/research/components/ResearchFormSelect";
import { useResearchToast } from "@/sites/research/components/ResearchToast";
import {
  IconHint,
  ResearchButton,
  researchFieldClass,
  researchTextareaClass,
} from "@/sites/research/components/ResearchPrimitives";
import { usePersistentTableValue } from "@/sites/research/components/TableControls";
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
  additionalEmails: string[];
  affiliation: string;
  avatarUrl: string | null;
  researchThemePreference: string;
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
  taskCode: string | null;
  title: string;
  description: string;
  category: string;
  status: string;
  clarifyDirection: "ASSIGNEE_TO_MANAGER" | "MANAGER_TO_ASSIGNEE" | null;
  taskType: string;
  dueDate: string | null;
  completedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TabKey = "dashboard" | "research" | "projects" | "proposals";
type PeriodKey =
  | "all"
  | "lastWeek"
  | "currentWeek"
  | "lastMonth"
  | "currentMonth";
type DashboardStatusKey =
  | "all"
  | "active"
  | "completed"
  | "revoked"
  | "overdue";

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function periodLabel(period: PeriodKey) {
  if (period === "currentWeek") return "This week";
  if (period === "lastWeek") return "Last week";
  if (period === "currentMonth") return "This month";
  if (period === "lastMonth") return "Last month";
  return "All time";
}

function periodStart(period: PeriodKey) {
  const currentDay = researchWeekday();
  const weekOffset = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = researchStartOfDay(new Date(), -weekOffset);

  if (period === "currentWeek") {
    return startOfCurrentWeek;
  }
  if (period === "lastWeek") {
    return researchStartOfDay(new Date(), -weekOffset - 7);
  }
  if (period === "currentMonth") {
    return researchStartOfMonth();
  }
  if (period === "lastMonth") {
    return researchStartOfMonth(new Date(), -1);
  }
  return null;
}

function periodEnd(period: PeriodKey) {
  const currentDay = researchWeekday();
  const weekOffset = currentDay === 0 ? 6 : currentDay - 1;
  const startOfCurrentWeek = researchStartOfDay(new Date(), -weekOffset);

  if (period === "lastWeek") {
    return startOfCurrentWeek;
  }
  if (period === "currentWeek") {
    return researchStartOfDay(new Date(), 7 - weekOffset);
  }
  if (period === "lastMonth") {
    return researchStartOfMonth();
  }
  if (period === "currentMonth") {
    return researchStartOfMonth(new Date(), 1);
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

function formatDate(value: string | null) {
  if (!value) return "-";
  return researchDateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}

function durationText(ms: number) {
  const absolute = Math.abs(ms);
  const hours = Math.max(1, Math.round(absolute / (1000 * 60 * 60)));
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours > 0 ? `${days}d ${restHours}h` : `${days}d`;
}

function displayTaskCode(task: ProfileTaskRow) {
  return (
    task.taskCode || task.id.replaceAll("-", "").slice(0, 10).toUpperCase()
  );
}

function taskStatusLabel(status: string) {
  if (status === "OPEN" || status === "IN_PROGRESS") return "In progress";
  if (status === "REVISION_REQUESTED") return "Revision requested";
  if (status === "NEED_CLARIFY") return "Need clarify";
  if (status === "CHECKING") return "Checking";
  if (status === "COMPLETED") return "Completed";
  if (status === "REVOKED") return "Revoked";
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function profileTaskStatusMeta(task: ProfileTaskRow) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const completed = task.completedAt ? new Date(task.completedAt) : null;

  if (task.status === "COMPLETED") {
    if (!due || !completed) {
      return {
        label: "Completed",
        detail: "Finished",
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    if (completed <= due) {
      return {
        label: "Completed",
        detail: `${durationText(due.getTime() - completed.getTime())} early`,
        detailClassName: "text-emerald-600 dark:text-emerald-300",
      };
    }
    return {
      label: "Overdue",
      detail: `${durationText(completed.getTime() - due.getTime())} late`,
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }
  if (task.status === "REVOKED") {
    return {
      label: "Revoked",
      detail: "Closed by assigner",
      detailClassName: "text-slate-600 dark:text-[#B0B0B0]",
    };
  }
  if (task.status === "CHECKING") {
    return {
      label: "Checking",
      detail: "Waiting assigner check",
      detailClassName: "text-violet-600 dark:text-violet-300",
    };
  }
  if (task.status === "REVISION_REQUESTED") {
    return {
      label: "Revision requested",
      detail: "Waiting assignee revision",
      detailClassName: "text-orange-700 dark:text-orange-300",
    };
  }
  if (task.status === "NEED_CLARIFY") {
    return {
      label: "Need clarify",
      detail:
        task.clarifyDirection === "MANAGER_TO_ASSIGNEE"
          ? "Waiting assignee answer"
          : "Waiting task manager answer",
      detailClassName: "text-amber-700 dark:text-amber-300",
    };
  }
  if (isOverdue(task)) {
    return {
      label: "Overdue",
      detail: `${durationText(Date.now() - (due?.getTime() ?? Date.now()))} late`,
      detailClassName: "text-rose-600 dark:text-rose-300",
    };
  }
  return {
    label: taskStatusLabel(task.status),
    detail: due
      ? `${durationText(due.getTime() - Date.now())} left`
      : "No due date",
    detailClassName:
      due && due.getTime() - Date.now() < 24 * 60 * 60 * 1000
        ? "font-semibold text-[#B64F48] dark:text-[#FFB4A2]"
        : "text-[#667085] dark:text-[#B0B0B0]",
  };
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
    task.status === "COMPLETED" ||
    task.status === "REVOKED"
  ) {
    return false;
  }
  return new Date(task.dueDate).getTime() < Date.now();
}

function matchesDashboardStatus(
  task: ProfileTaskRow,
  statusKey: DashboardStatusKey,
) {
  if (statusKey === "all") return true;
  if (statusKey === "overdue") return isOverdue(task);
  if (statusKey === "completed") return task.status === "COMPLETED";
  if (statusKey === "revoked") return task.status === "REVOKED";
  return (
    (task.status === "OPEN" ||
      task.status === "IN_PROGRESS" ||
      task.status === "REVISION_REQUESTED" ||
      task.status === "CHECKING" ||
      task.status === "NEED_CLARIFY") &&
    !isOverdue(task)
  );
}

function dashboardStatusTabs(tasks: ProfileTaskRow[]) {
  const entries: { key: DashboardStatusKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "overdue", label: "Overdue" },
    { key: "revoked", label: "Revoked" },
  ];

  return entries.map((item) => ({
    ...item,
    value: tasks.filter((task) => matchesDashboardStatus(task, item.key))
      .length,
  }));
}

export function ProfileClient({
  user,
  researchRows,
  projectRows,
  proposalRows,
  taskRows,
  canEditProfile,
  canChangePassword,
}: {
  user: ResearchProfileUser;
  researchRows: ResearchProjectRow[];
  projectRows: OrganizedProjectRow[];
  proposalRows: ProposalRow[];
  taskRows: ProfileTaskRow[];
  canEditProfile: boolean;
  canChangePassword: boolean;
}) {
  const router = useRouter();
  const toast = useResearchToast();
  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const isAssistantProfile = user.roles.some(
    (role) => role === "ASSISTANT" || role === "CHIEF_ASSISTANT",
  );
  const [activeTab, setActiveTab] = useState<TabKey>(() =>
    isAssistantProfile ? "dashboard" : "research",
  );
  const [period, setPeriod] = usePersistentTableValue<PeriodKey>(
    "profile:period",
    "all",
  );
  const [dashboardStatus, setDashboardStatus] =
    usePersistentTableValue<DashboardStatusKey>("profile:status", "all");

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
      detail: "The research profile information has been saved.",
    });
  }

  async function savePassword(formData: FormData) {
    setIsPasswordSaving(true);
    const result = await updateResearchPassword(formData);
    setIsPasswordSaving(false);
    if (result.error) {
      toast.showError({
        title: "Password not changed",
        detail: result.error,
      });
      return;
    }
    setPasswordOpen(false);
    toast.showSuccess({
      title: "Password changed",
      detail: "Your research account password has been updated.",
    });
  }

  const roleText = user.roles.map(roleLabel).join(", ") || "Research user";
  const profileEmails = [user.email, ...user.additionalEmails].filter(Boolean);
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
      value: taskRows.length,
      icon: ClipboardList,
      hint: "Research tasks assigned to this user.",
    },
  ];
  const tabs = [
    {
      key: "dashboard" as const,
      label: "Dashboard",
      value: taskRows.length,
      icon: BarChart3,
    },
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
  const statusTabs = useMemo(
    () => dashboardStatusTabs(periodTasks),
    [periodTasks],
  );
  const filteredTasks = useMemo(
    () =>
      periodTasks
        .filter((task) => matchesDashboardStatus(task, dashboardStatus))
        .sort(
          (left, right) =>
            new Date(right.updatedAt).getTime() -
            new Date(left.updatedAt).getTime(),
        ),
    [dashboardStatus, periodTasks],
  );
  const completionRate =
    periodTasks.length === 0
      ? 0
      : Math.round(
          (periodTasks.filter((task) => task.status === "COMPLETED").length /
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
                <IconHint label="Email verified" position="bottom">
                  <span className="inline-flex cursor-help text-[#A8DADC] transition duration-200 ease-out hover:-translate-y-0.5 hover:text-[#C9F0F2]">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Email verified</span>
                  </span>
                </IconHint>
              )}
              {(canEditProfile || canChangePassword) && (
                <>
                  {canChangePassword && (
                    <IconHint label="Change password" position="bottom">
                      <button
                        type="button"
                        onClick={() => setPasswordOpen(true)}
                        className="research-allow-transform inline-flex cursor-pointer border-0 bg-transparent p-1 text-[#B0B0B0] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#B39CD0] focus-visible:outline-none focus-visible:ring-0 active:translate-y-0 active:scale-95"
                        aria-label="Change password"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                    </IconHint>
                  )}
                  {canEditProfile && (
                    <IconHint label="Edit profile" position="bottom">
                      <button
                        type="button"
                        onClick={() => setEditOpen(true)}
                        className="research-allow-transform inline-flex cursor-pointer border-0 bg-transparent p-1 text-[#B0B0B0] transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-transparent hover:text-[#A8DADC] focus-visible:outline-none focus-visible:ring-0 active:translate-y-0 active:scale-95"
                        aria-label="Edit profile"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </IconHint>
                  )}
                </>
              )}
            </div>
            <p className="mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs text-[#B0B0B0]">
              {profileEmails.length > 0 && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <Mail className="h-3.5 w-3.5 flex-none" />
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    {profileEmails.map((email, index) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-2"
                      >
                        {index > 0 && (
                          <span className="text-[#666666]" aria-hidden="true">
                            |
                          </span>
                        )}
                        <span>{email}</span>
                      </span>
                    ))}
                  </span>
                </span>
              )}
              {profileEmails.length > 0 && (
                <span className="text-[#666666]">|</span>
              )}
              <span className="truncate">{roleText}</span>
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>

      <div className="mx-auto max-w-7xl space-y-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-[#444444] pb-3 sm:grid-cols-4">
          {stats.map((item, index) => (
            <IconHint key={item.label} label={item.hint}>
              <div
                className={`flex cursor-help items-center justify-between gap-3 transition duration-200 ease-out ${
                  index > 0 ? "sm:border-l sm:border-[#444444] sm:pl-6" : ""
                } ${index % 2 === 1 ? "pl-6 sm:pl-6" : ""} ${
                  index > 1 ? "pt-4 sm:pt-0" : ""
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
          <div className="journal-detail-tabs grid w-full grid-cols-4 border border-[#444444] bg-[#242424] p-1 text-center">
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

          {activeTab === "dashboard" && (
            <TaskDashboard
              period={period}
              onPeriodChange={setPeriod}
              dashboardStatus={dashboardStatus}
              onDashboardStatusChange={setDashboardStatus}
              total={periodTasks.length}
              completionRate={completionRate}
              statusTabs={statusTabs}
              filteredTasks={filteredTasks}
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
            <ProposalsTable
              rows={proposalRows}
              isAdmin={false}
              linkTitleToDetail
            />
          )}
        </section>
      </div>

      <ResearchModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title="Change password"
        icon={<KeyRound className="h-5 w-5" />}
        maxWidth="max-w-xl"
        headerActions={
          <ResearchButton
            form="profile-password-form"
            disabled={isPasswordSaving}
          >
            {isPasswordSaving ? (
              <Check className="h-4 w-4" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {isPasswordSaving ? "Saving..." : "Save password"}
          </ResearchButton>
        }
      >
        <form
          id="profile-password-form"
          action={savePassword}
          className="grid gap-5"
        >
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              <span>Current password</span>
              <span className="research-required-mark">(*)</span>
            </span>
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Type your current password"
              className={researchFieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              <span>New password</span>
              <span className="research-required-mark">(*)</span>
            </span>
            <input
              name="newPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className={researchFieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              <span>Confirm new password</span>
              <span className="research-required-mark">(*)</span>
            </span>
            <input
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Type the new password again"
              className={researchFieldClass}
            />
          </label>
        </form>
      </ResearchModal>

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
          <input type="hidden" name="targetUserId" value={user.id} />
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              <span>Display name</span>
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
            <span className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              <span>Affiliation</span>
              <span className="research-required-mark">(*)</span>
            </span>
            <input
              name="affiliation"
              defaultValue={user.affiliation}
              required
              className={researchFieldClass}
            />
          </label>
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              <span>Additional emails</span>
            </span>
            <textarea
              name="additionalEmails"
              defaultValue={user.additionalEmails.join("\n")}
              placeholder="Optional. Add one extra contact email per line."
              className={`${researchTextareaClass} min-h-28`}
            />
            <span className="text-xs font-normal text-[#B0B0B0]">
              These emails are only for research contact choices. Login still
              uses your main email.
            </span>
          </label>
          <label className="grid gap-1.5 text-sm font-normal text-[#E4E4E4]">
            <span className="inline-flex items-center gap-1 text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
              <span>Theme preference</span>
            </span>
            <ResearchFormSelect
              name="researchThemePreference"
              defaultValue={
                ["system", "light", "dark"].includes(
                  user.researchThemePreference,
                )
                  ? user.researchThemePreference
                  : "system"
              }
              ariaLabel="Theme preference"
              options={[
                { value: "system", label: "System" },
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
            />
            <span className="text-xs font-normal leading-5 text-[#B0B0B0]">
              System follows the research site schedule automatically: light
              mode from 6:00 AM to 6:00 PM in Hanoi time, then dark mode
              overnight. Choose Light or Dark to keep that theme active at all
              times, regardless of the time of day.
            </span>
          </label>
        </form>
      </ResearchModal>
    </>
  );
}

function TaskDashboard({
  period,
  onPeriodChange,
  dashboardStatus,
  onDashboardStatusChange,
  total,
  completionRate,
  statusTabs,
  filteredTasks,
}: {
  period: PeriodKey;
  onPeriodChange: (period: PeriodKey) => void;
  dashboardStatus: DashboardStatusKey;
  onDashboardStatusChange: (status: DashboardStatusKey) => void;
  total: number;
  completionRate: number;
  statusTabs: { key: DashboardStatusKey; label: string; value: number }[];
  filteredTasks: ProfileTaskRow[];
}) {
  const overdueCount =
    statusTabs.find((item) => item.key === "overdue")?.value ?? 0;
  const activeCount =
    statusTabs.find((item) => item.key === "active")?.value ?? 0;

  return (
    <div className="border border-[#444444] bg-[#2C2C2C]">
      <div className="flex flex-col gap-3 border-b border-[#444444] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
            Task Performance
          </p>
          <p className="mt-1 text-sm text-[#E4E4E4]">
            {total} task{total === 1 ? "" : "s"} tracked - {completionRate}%
            completion rate
          </p>
          <p className="mt-1 text-xs text-[#B0B0B0]">
            {activeCount} active task{activeCount === 1 ? "" : "s"} and{" "}
            {overdueCount} overdue in the selected period.
          </p>
        </div>
        <div className="grid grid-cols-2 border border-[#444444] bg-[#242424] p-1 md:grid-cols-5">
          {(
            [
              "all",
              "currentWeek",
              "lastWeek",
              "currentMonth",
              "lastMonth",
            ] as PeriodKey[]
          ).map((item) => (
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

      <div className="p-4">
        <p className="text-xs font-normal uppercase tracking-wide text-[#B0B0B0]">
          Task Status
        </p>
        <div className="journal-detail-tabs mt-4 flex flex-wrap border border-[#444444] bg-[#242424] p-1">
          {statusTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              data-active={dashboardStatus === item.key}
              aria-pressed={dashboardStatus === item.key}
              onClick={() => onDashboardStatusChange(item.key)}
              className="journal-detail-tab-button min-w-[8.5rem] flex-1 cursor-pointer rounded-none px-3 py-3 text-left"
            >
              <span className="relative z-10 flex items-center justify-between gap-3">
                <span className="text-[11px] font-normal uppercase tracking-wide">
                  {item.label}
                </span>
                <span className="text-sm font-normal">{item.value}</span>
              </span>
            </button>
          ))}
        </div>

        <ProfileTaskTable rows={filteredTasks} />
      </div>
    </div>
  );
}

function ProfileTaskTable({ rows }: { rows: ProfileTaskRow[] }) {
  return (
    <div className="mt-4 overflow-hidden border border-[#444444]">
      <table className="w-full table-fixed text-left">
        <thead className="border-b border-[#444444] bg-[#383838] text-xs uppercase tracking-wide text-[#B0B0B0]">
          <tr>
            <th className="w-[7rem] px-3 py-3">ID</th>
            <th className="px-3 py-3">Task</th>
            <th className="w-[9rem] px-3 py-3">Type</th>
            <th className="w-[10rem] px-3 py-3">Status</th>
            <th className="w-[8rem] px-3 py-3">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#444444]">
          {rows.length > 0 ? (
            rows.map((task) => {
              const status = profileTaskStatusMeta(task);
              return (
                <tr
                  key={task.id}
                  className="align-top transition-colors duration-150 odd:bg-[#2C2C2C] even:bg-[#262626] hover:bg-[#303030]"
                >
                  <td className="px-3 py-3 align-top">
                    <Link href={`/tasks/${task.id}`}>
                      <span className="font-mono text-xs text-[#B0B0B0] transition hover:text-[#A8DADC]">
                        {displayTaskCode(task)}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Link
                      href={`/tasks/${task.id}`}
                      className="group block min-w-0"
                    >
                      <span className="block text-sm text-[#E4E4E4] transition group-hover:text-[#A8DADC]">
                        {task.title}
                      </span>
                      <span className="mt-1 block line-clamp-3 whitespace-pre-line break-words text-xs leading-5 text-[#B0B0B0]">
                        {task.description || "No extra note on this task."}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-[#E4E4E4]">
                    <span className="block">
                      {taskTypeLabel(task.taskType)}
                    </span>
                    <span className="mt-1 block text-xs text-[#B0B0B0]">
                      {task.category
                        ? task.category
                            .toLowerCase()
                            .replace(/\b\w/g, (letter) => letter.toUpperCase())
                        : "General"}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <span className="block text-sm text-[#E4E4E4]">
                      {status.label}
                    </span>
                    <span
                      className={`mt-1 block text-xs leading-5 ${status.detailClassName}`}
                    >
                      {status.detail}
                    </span>
                  </td>
                  <td className="px-3 py-3 align-top text-sm text-[#E4E4E4]">
                    {formatDate(task.dueDate)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-[#B0B0B0]"
              >
                No tasks match this status in the selected period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
