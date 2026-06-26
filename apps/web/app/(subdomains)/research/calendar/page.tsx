import { redirect } from "next/navigation";
import { prisma, Role } from "@repo/db";
import { auth } from "../../../../auth";
import { ResearchPageHeaderPortal } from "@/sites/research/components/ResearchPageHeaderPortal";
import {
  createResearchCalendarItem,
  deleteResearchCalendarItem,
  updateResearchCalendarItem,
} from "./actions";
import {
  ResearchCalendarClient,
  type ResearchCalendarItemRow,
} from "./ResearchCalendarClient";

export const dynamic = "force-dynamic";

function parseMonth(value?: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return new Date();
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const date = new Date(year, month, 1);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function visibleRange(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  const firstVisibleDay = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - mondayOffset,
  );
  const lastVisibleDay = new Date(
    firstVisibleDay.getFullYear(),
    firstVisibleDay.getMonth(),
    firstVisibleDay.getDate() + 42,
  );
  return { start: firstVisibleDay, end: lastVisibleDay };
}

export default async function ResearchCalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const roles = ((session?.user as { roles?: Role[] } | undefined)?.roles ??
    []) as Role[];
  if (!userId) redirect("/login");
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { activeSites: true },
  });
  if (
    !currentUser?.activeSites.includes("research") ||
    !roles.includes(Role.ADMIN)
  ) {
    redirect("/401");
  }

  const params = await searchParams;
  const month = parseMonth(params?.month);
  const range = visibleRange(month);
  const items = await prisma.researchCalendarItem.findMany({
    where: {
      startAt: { lt: range.end },
      OR: [{ endAt: null }, { endAt: { gte: range.start } }],
    },
    include: {
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: [{ startAt: "asc" }, { title: "asc" }],
  });

  const rows: ResearchCalendarItemRow[] = items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? "",
    location: item.location ?? "",
    itemType: item.itemType,
    status: item.status,
    color: item.color,
    allDay: item.allDay,
    startAt: item.startAt.toISOString(),
    endAt: item.endAt?.toISOString() ?? null,
    createdBy:
      item.createdBy.name?.trim() || item.createdBy.email || "Research admin",
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <ResearchPageHeaderPortal>
        <div className="flex min-w-0 items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-normal uppercase text-slate-700 dark:text-[#E4E4E4]">
              Calendar
            </p>
            <p className="mt-1 hidden text-xs text-slate-500 sm:block dark:text-[#B0B0B0]">
              Manage events and things to do for the research site.
            </p>
          </div>
        </div>
      </ResearchPageHeaderPortal>
      <ResearchCalendarClient
        initialMonth={monthValue(month)}
        items={rows}
        createAction={createResearchCalendarItem}
        updateAction={updateResearchCalendarItem}
        deleteAction={deleteResearchCalendarItem}
      />
    </div>
  );
}
