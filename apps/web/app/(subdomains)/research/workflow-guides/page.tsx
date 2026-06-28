import { redirect } from "next/navigation";
import { Prisma, prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import { researchDateTimeFormat } from "@/sites/research/lib/date-time";
import { displayResearchPersonName } from "@/sites/research/lib/display";
import {
  createWorkflowGuide,
  deleteWorkflowGuide,
  updateWorkflowGuide,
} from "./actions";
import {
  WorkflowGuideHeaderAction,
  WorkflowGuidesClient,
  type WorkflowGuideRow,
  type WorkflowStep,
} from "./WorkflowGuidesClient";

export const dynamic = "force-dynamic";

const demoGuides = [
  {
    guideCode: "AWG001",
    title: "From Assignment To First Output",
    content:
      "Use this guide when a new task is assigned. Confirm the task type, read all linked task guides, inspect the research record, and ask clarification before starting if scope, file, venue, or expected output is unclear.",
    workflow: [
      {
        title: "Read task and guide",
        detail: "Open the task, read every guide icon, and note the expected deliverable.",
      },
      {
        title: "Check input quality",
        detail: "If research files or instructions are missing, request clarification before work starts.",
      },
      {
        title: "Prepare output",
        detail: "Follow the task guide format and keep source links or decision notes.",
      },
      {
        title: "Finish or clarify",
        detail: "Submit only when ready. If blocked, ask a precise question.",
      },
    ],
  },
  {
    guideCode: "AWG002",
    title: "Venue Suggestion Decision Path",
    content:
      "Use this flow for journal or conference suggestion work. The goal is not only to find venues, but to explain why each venue is suitable or unsuitable for the research.",
    workflow: [
      {
        title: "Match scope",
        detail: "Compare title, abstract, keywords, indexing, and publication type.",
      },
      {
        title: "Check risk",
        detail: "If the venue looks predatory, inactive, mismatched, or fee-heavy, mark the concern.",
      },
      {
        title: "Branch decision",
        detail: "Suitable venues go to suggested list. Risky venues need notes or rejection.",
      },
      {
        title: "Submit evidence",
        detail: "Include links, scope match, indexing, APC, deadlines, and final recommendation.",
      },
    ],
  },
  {
    guideCode: "AWG003",
    title: "Clarification And Checker Feedback",
    content:
      "Use this flow when the assistant, checker, or assigner needs feedback. Everyone should keep feedback loops moving within 24 hours.",
    workflow: [
      {
        title: "Question appears",
        detail: "Identify whether the question belongs to assignee or checker/manager side.",
      },
      {
        title: "Answer within 24h",
        detail: "If you know the answer, respond clearly. If not, escalate with the missing fact.",
      },
      {
        title: "Resume or review",
        detail: "Assignee resumes work, or checker reviews the answer and makes approval/revision decision.",
      },
      {
        title: "Close loop",
        detail: "Finish, approve, request redo, or ask one more targeted clarification.",
      },
    ],
  },
] satisfies Array<{
  guideCode: string;
  title: string;
  content: string;
  workflow: WorkflowStep[];
}>;

function fileSizeLabel(value: number | null) {
  if (!value) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function ensureDemoWorkflowGuides() {
  const count = await prisma.assistantWorkflowGuide.count();
  if (count > 0) return;
  await prisma.assistantWorkflowGuide.createMany({
    data: demoGuides.map((guide) => ({
      guideCode: guide.guideCode,
      title: guide.title,
      content: guide.content,
      workflow: guide.workflow as unknown as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });
}

function workflowSteps(value: Prisma.JsonValue): WorkflowStep[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title : "";
      const detail = typeof record.detail === "string" ? record.detail : "";
      if (!title.trim()) return null;
      return { title, detail };
    })
    .filter((item): item is WorkflowStep => Boolean(item));
}

export default async function WorkflowGuidesPage() {
  const session = await auth();
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  const canView =
    roles.includes(Role.ADMIN) ||
    roles.includes(Role.CHIEF_ASSISTANT) ||
    roles.includes(Role.ASSISTANT);
  if (!canView) redirect("/401");
  const isAdmin = roles.includes(Role.ADMIN);

  await ensureDemoWorkflowGuides();

  const guides = await prisma.assistantWorkflowGuide.findMany({
    select: {
      id: true,
      guideCode: true,
      title: true,
      content: true,
      workflow: true,
      supportFileName: true,
      supportFileSize: true,
      updatedAt: true,
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { guideCode: "asc" }],
  });

  const rows: WorkflowGuideRow[] = guides.map((guide) => ({
    id: guide.id,
    guideCode: guide.guideCode,
    title: guide.title,
    content: guide.content,
    workflow: workflowSteps(guide.workflow),
    workflowText: workflowSteps(guide.workflow)
      .map((step) => `${step.title}${step.detail ? ` :: ${step.detail}` : ""}`)
      .join("\n"),
    supportFileName: guide.supportFileName ?? "",
    supportFileSize: fileSizeLabel(guide.supportFileSize),
    updatedAt: researchDateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }).format(guide.updatedAt),
    createdBy: guide.createdBy
      ? displayResearchPersonName(guide.createdBy)
      : "System sample",
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex w-full items-center justify-between gap-4">
          <p className="text-sm font-normal uppercase text-slate-700 dark:text-[#E4E4E4]">
            Assistant Workflow Guides
          </p>
          <WorkflowGuideHeaderAction
            isAdmin={isAdmin}
            createAction={createWorkflowGuide}
          />
        </div>
      </ResearchPageHeaderPortal>
      <WorkflowGuidesClient
        rows={rows}
        isAdmin={isAdmin}
        createAction={createWorkflowGuide}
        updateAction={updateWorkflowGuide}
        deleteAction={deleteWorkflowGuide}
      />
    </div>
  );
}
