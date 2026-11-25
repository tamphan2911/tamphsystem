import { Prisma, prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { hasCamSession } from "@/sites/cam/server/auth";
import {
  CAM_BORN_AT,
  camAgeDays,
  camReferenceForAge,
} from "@/sites/cam/server/reference";
import { camTimeRules, camWeeklyWindow } from "@/sites/cam/server/time-preferences";
import {
  CAM_INSIGHT_SUGGESTION_VERSION,
  hasCurrentInsightSuggestion,
  insightInstructions,
  qualitativeSuggestion,
  unavailableSuggestion,
} from "@/sites/cam/server/insight-suggestion";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

type CareEvent = {
  type: string;
  timestamp: Date;
  data: Prisma.JsonValue;
};

type CareTotals = {
  feeds: number;
  bottleMl: number;
  wet: number;
  dirty: number;
  diapers: number;
  sleepMinutes: number;
  baths: number;
  sunbathing: number;
  walks: number;
};

function unauthorized() {
  return NextResponse.json(
    { error: "LittleLog sign-in is required." },
    { status: 401, headers: noStoreHeaders },
  );
}

function numberFromJson(value: Prisma.JsonValue | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function eventData(event: CareEvent) {
  return event.data && typeof event.data === "object" && !Array.isArray(event.data)
    ? event.data
    : {};
}

function totalsFor(events: CareEvent[]): CareTotals {
  const totals: CareTotals = {
    feeds: 0,
    bottleMl: 0,
    wet: 0,
    dirty: 0,
    diapers: 0,
    sleepMinutes: 0,
    baths: 0,
    sunbathing: 0,
    walks: 0,
  };
  for (const event of events) {
    const data = eventData(event);
    if (event.type === "feed") {
      totals.feeds += 1;
      if (data.mode === "bottle") totals.bottleMl += numberFromJson(data.amount);
    }
    if (event.type === "diaper") {
      totals.diapers += 1;
      if (data.kind === "wet") totals.wet += 1;
      if (data.kind === "dirty") totals.dirty += 1;
    }
    if (event.type === "sleep") totals.sleepMinutes += numberFromJson(data.durationMin);
    if (event.type === "bath") totals.baths += 1;
    if (event.type === "sunbathing") totals.sunbathing += 1;
    if (event.type === "walk") totals.walks += 1;
  }
  return totals;
}

function eventsInWindow(events: CareEvent[], start: Date, end: Date) {
  return events.filter(
    (event) => event.timestamp >= start && event.timestamp < end,
  );
}

function averageLoggedDays(days: CareTotals[]) {
  if (!days.length) return null;
  const keys: Array<keyof CareTotals> = [
    "feeds",
    "bottleMl",
    "wet",
    "dirty",
    "diapers",
    "sleepMinutes",
    "baths",
    "sunbathing",
    "walks",
  ];
  return Object.fromEntries(
    keys.map((key) => [
      key,
      days.reduce((total, day) => total + day[key], 0) / days.length,
    ]),
  );
}

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) return content.text;
    }
  }
  return "";
}

async function generateOpenAiSuggestion(source: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.OPENAI_CAM_MODEL?.trim() || "gpt-6.2-astra";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const input = attempt
      ? { report: source, revision: "Write a fresh interpretation with no counts or totals and a specific next step." }
      : source;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        reasoning: { effort: "low" },
        store: false,
        max_output_tokens: 500,
        instructions: insightInstructions("weekly"),
        input: JSON.stringify(input),
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`OpenAI Responses API returned ${response.status}`);
    const text = qualitativeSuggestion(outputText(await response.json()));
    if (text) return { text, model };
  }
  throw new Error("OpenAI returned an incomplete or numeric weekly suggestion");
}

function responsePayload(
  insight: {
    weekNumber: number;
    status: string;
    suggestion: string | null;
    model: string | null;
    generatedAt: Date | null;
    windowStart: Date;
    windowEnd: Date;
  },
  currentWeekNumber: number,
  nextAvailableAt: Date,
) {
  return {
    status: insight.status,
    weekNumber: insight.weekNumber,
    suggestion: insight.suggestion,
    provider: insight.status === "ready" ? "openai" : "unavailable",
    model: insight.model,
    generatedAt: insight.generatedAt?.toISOString() ?? null,
    windowStart: insight.windowStart.toISOString(),
    windowEnd: insight.windowEnd.toISOString(),
    currentWeekNumber,
    nextAvailableAt: nextAvailableAt.toISOString(),
  };
}

export async function GET() {
  const session = await hasCamSession();
  if (!session) return unauthorized();

  const storedState = await prisma.camCareState.findUnique({ where: { userId: session.userId }, select: { settings: true } });
  const { careDayStart, weeklyReportTime, timeZone } = camTimeRules(storedState?.settings);
  const window = camWeeklyWindow(CAM_BORN_AT, weeklyReportTime, new Date(), timeZone);
  if (!window.completedWeekNumber) {
    return NextResponse.json(
      {
        status: "pending",
        weekNumber: null,
        suggestion: null,
        provider: null,
        model: null,
        generatedAt: null,
        windowStart: window.windowStart.toISOString(),
        windowEnd: window.windowEnd.toISOString(),
        currentWeekNumber: window.currentWeekNumber,
        nextAvailableAt: window.nextAvailableAt.toISOString(),
      },
      { headers: noStoreHeaders },
    );
  }

  const gptConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const uniqueWhere = {
    userId_weekNumber: {
      userId: session.userId,
      weekNumber: window.completedWeekNumber,
    },
  };
  const existing = await prisma.camCareWeeklyInsight.findUnique({
    where: uniqueWhere,
  });
  const matchesTimeRule = existing?.source && typeof existing.source === "object"
    && !Array.isArray(existing.source) && existing.source.careDayStart === careDayStart
    && existing.source.timeZone === timeZone
    && hasCurrentInsightSuggestion(existing.source);
  if (matchesTimeRule && existing?.suggestion && (existing.status === "ready" || !gptConfigured)) {
    return NextResponse.json(
      responsePayload(existing, window.currentWeekNumber, window.nextAvailableAt),
      { headers: noStoreHeaders },
    );
  }
  if (session.role === "observer") {
    return NextResponse.json({ status: "pending", weekNumber: window.completedWeekNumber, suggestion: null, provider: null, model: null, generatedAt: null, windowStart: window.windowStart.toISOString(), windowEnd: window.windowEnd.toISOString(), currentWeekNumber: window.currentWeekNumber, nextAvailableAt: window.nextAvailableAt.toISOString() }, { headers: noStoreHeaders });
  }
  if (
    matchesTimeRule && existing?.status === "generating" &&
    Date.now() - existing.updatedAt.getTime() < 2 * 60_000
  ) {
    return NextResponse.json(
      {
        status: "generating",
        weekNumber: window.completedWeekNumber,
        suggestion: null,
        windowStart: window.windowStart.toISOString(),
        windowEnd: window.windowEnd.toISOString(),
        currentWeekNumber: window.currentWeekNumber,
        nextAvailableAt: window.nextAvailableAt.toISOString(),
      },
      { status: 202, headers: noStoreHeaders },
    );
  }

  const previousStart = new Date(window.windowStart.getTime() - WEEK_MS);
  const events = await prisma.camCareEvent.findMany({
    where: {
      userId: session.userId,
      deletedAt: null,
      type: { in: ["feed", "diaper", "sleep", "bath", "sunbathing", "walk", "note"] },
      timestamp: { gte: previousStart, lt: window.windowEnd },
    },
    select: { type: true, timestamp: true, data: true },
    orderBy: { timestamp: "asc" },
  });
  const currentEvents = eventsInWindow(events, window.windowStart, window.windowEnd);
  const previousEvents = eventsInWindow(events, previousStart, window.windowStart);
  const loggedDays = Array.from({ length: 7 }, (_, index) => {
    const start = new Date(window.windowStart.getTime() + index * DAY_MS);
    const end = new Date(start.getTime() + DAY_MS);
    const dayEvents = eventsInWindow(currentEvents, start, end);
    return dayEvents.length ? totalsFor(dayEvents) : null;
  }).filter((day): day is CareTotals => Boolean(day));

  const current = totalsFor(currentEvents);
  const previous = previousEvents.length ? totalsFor(previousEvents) : null;
  const ageDays = camAgeDays(window.windowEnd);
  const reference = camReferenceForAge(ageDays);
  const localFallback = unavailableSuggestion(currentEvents.length > 0);
  const source = {
    suggestionVersion: CAM_INSIGHT_SUGGESTION_VERSION,
    babyWeekNumber: window.completedWeekNumber,
    weekDefinition: "Exact seven-day windows anchored to Cam’s birth time; each completed review becomes available at the configured weekly report time after the week ends.",
    careDayStart,
    weeklyReportTime,
    timeZone,
    reportWindow: {
      start: window.windowStart.toISOString(),
      end: window.windowEnd.toISOString(),
    },
    baby: { ageDays, ageGroup: reference.ageLabel },
    current,
    previous,
    currentLoggedDayAverage: averageLoggedDays(loggedDays),
    loggedDaysUsedForAverage: loggedDays.length,
    broadAgeReferencePerDay: reference,
    caveat:
      "Records may be incomplete. Bottle totals exclude milk taken directly at the breast.",
  };

  if (existing) {
    await prisma.camCareWeeklyInsight.update({
      where: { id: existing.id },
      data: { status: "generating", suggestion: null, source: source as Prisma.InputJsonValue },
    });
  } else {
    try {
      await prisma.camCareWeeklyInsight.create({
        data: {
          userId: session.userId,
          weekNumber: window.completedWeekNumber,
          windowStart: window.windowStart,
          windowEnd: window.windowEnd,
          status: "generating",
          source: source as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrent = await prisma.camCareWeeklyInsight.findUnique({
          where: uniqueWhere,
        });
        if (concurrent) {
          return NextResponse.json(
            responsePayload(
              concurrent,
              window.currentWeekNumber,
              window.nextAvailableAt,
            ),
            { status: concurrent.suggestion ? 200 : 202, headers: noStoreHeaders },
          );
        }
      }
      throw error;
    }
  }

  let suggestion = localFallback;
  let status = "fallback";
  let model: string | null = null;
  try {
    const generated = await generateOpenAiSuggestion(source);
    if (generated) {
      suggestion = generated.text;
      status = "ready";
      model = generated.model;
    }
  } catch (error) {
    console.error("[cam-weekly-insight] OpenAI suggestion failed", error);
  }

  const saved = await prisma.camCareWeeklyInsight.update({
    where: uniqueWhere,
    data: {
      status,
      suggestion,
      model,
      generatedAt: new Date(),
      source: source as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(
    responsePayload(saved, window.currentWeekNumber, window.nextAvailableAt),
    { headers: noStoreHeaders },
  );
}
