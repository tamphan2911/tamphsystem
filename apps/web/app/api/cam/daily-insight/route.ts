import { Prisma, prisma } from "@repo/db";
import { NextResponse } from "next/server";
import { hasCamSession } from "@/sites/cam/server/auth";
import {
  camAgeDays,
  camReferenceForAge,
} from "@/sites/cam/server/reference";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };
const DAY_MS = 86_400_000;
const REPORT_TIME_ZONE = "Asia/Ho_Chi_Minh";
const REPORT_OFFSET = "+07:00";

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
};

function unauthorized() {
  return NextResponse.json(
    { error: "LittleLog sign-in is required." },
    { status: 401, headers: noStoreHeaders },
  );
}

function dateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function latestCompletedWindow(at = new Date()) {
  const today = dateKey(at);
  const todayEnd = new Date(`${today}T20:00:00${REPORT_OFFSET}`);
  const windowEnd = new Date(
    at >= todayEnd ? todayEnd.getTime() : todayEnd.getTime() - DAY_MS,
  );
  const nextAvailableAt = new Date(
    at >= todayEnd ? todayEnd.getTime() + DAY_MS : todayEnd.getTime(),
  );
  return {
    reportDate: dateKey(windowEnd),
    windowStart: new Date(windowEnd.getTime() - DAY_MS),
    windowEnd,
    nextAvailableAt,
  };
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
    if (event.type === "sleep") {
      totals.sleepMinutes += numberFromJson(data.durationMin);
    }
    if (event.type === "bath") totals.baths += 1;
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
  const sum = days.reduce(
    (result, day) => ({
      feeds: result.feeds + day.feeds,
      bottleMl: result.bottleMl + day.bottleMl,
      wet: result.wet + day.wet,
      dirty: result.dirty + day.dirty,
      diapers: result.diapers + day.diapers,
      sleepMinutes: result.sleepMinutes + day.sleepMinutes,
      baths: result.baths + day.baths,
    }),
    {
      feeds: 0,
      bottleMl: 0,
      wet: 0,
      dirty: 0,
      diapers: 0,
      sleepMinutes: 0,
      baths: 0,
    },
  );
  return Object.fromEntries(
    Object.entries(sum).map(([key, value]) => [key, value / days.length]),
  );
}

function comparisonWord(current: number, previous: number, unit: string) {
  if (current === previous) return `${unit} were steady`;
  return `${unit} were ${current > previous ? "higher" : "lower"}`;
}

function fallbackSuggestion(
  current: CareTotals,
  previous: CareTotals | null,
  ageLabel: string,
) {
  const comparison = previous
    ? `${comparisonWord(current.feeds, previous.feeds, "feeds")} and ${comparisonWord(current.diapers, previous.diapers, "diaper changes")}`
    : "this is the first completed care day with enough logged activity to compare";
  return `Cam logged ${current.feeds} feeds, ${current.diapers} diaper changes, and ${Math.round(current.sleepMinutes / 60)} hours of sleep; ${comparison}. Compare the pattern gently with broad ${ageLabel} references, remembering that missing logs and direct breastfeeding can make totals look lower.`;
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

function exactlyTwoSentences(text: string, fallback: string) {
  const split = (value: string) =>
    value
      .replace(/\s+/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
  const generated = split(text);
  const backup = split(fallback);
  const sentences = [...generated.slice(0, 2), ...backup].slice(0, 2);
  return sentences
    .map((sentence) =>
      /[.!?]$/.test(sentence) ? sentence : `${sentence}.`,
    )
    .join(" ");
}

async function generateOpenAiSuggestion(source: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const model = process.env.OPENAI_CAM_MODEL?.trim() || "gpt-6.2-astra";
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
      max_output_tokens: 180,
      instructions:
        "You write a calm, practical LittleLog suggestion for a parent. Return exactly two short sentences with no heading or bullets. Compare the completed 8 PM care day with the previous day and logged-day average when those exist, then use the supplied age-based reference only as broad educational context. Never diagnose, never call a baby normal or abnormal, and never invent missing data. Mention that direct breastfeeding volume is not measured when bottle volume is relevant.",
      input: JSON.stringify(source),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`OpenAI Responses API returned ${response.status}`);
  }
  const text = outputText(await response.json()).replace(/\s+/g, " ").trim();
  if (!text) throw new Error("OpenAI returned an empty suggestion");
  return { text: text.slice(0, 900), model };
}

function responsePayload(
  insight: {
    reportDate: string;
    status: string;
    suggestion: string | null;
    model: string | null;
    generatedAt: Date | null;
  },
  nextAvailableAt: Date,
) {
  return {
    status: insight.status,
    reportDate: insight.reportDate,
    suggestion: insight.suggestion,
    provider: insight.status === "ready" ? "openai" : "rules",
    model: insight.model,
    generatedAt: insight.generatedAt?.toISOString() ?? null,
    nextAvailableAt: nextAvailableAt.toISOString(),
  };
}

export async function GET() {
  const session = await hasCamSession();
  if (!session) return unauthorized();

  const window = latestCompletedWindow();
  const existing = await prisma.camCareDailyInsight.findUnique({
    where: {
      userId_reportDate: {
        userId: session.userId,
        reportDate: window.reportDate,
      },
    },
  });
  if (existing?.suggestion) {
    return NextResponse.json(
      responsePayload(existing, window.nextAvailableAt),
      { headers: noStoreHeaders },
    );
  }
  if (
    existing?.status === "generating" &&
    Date.now() - existing.updatedAt.getTime() < 2 * 60_000
  ) {
    return NextResponse.json(
      {
        status: "generating",
        reportDate: window.reportDate,
        suggestion: null,
        nextAvailableAt: window.nextAvailableAt.toISOString(),
      },
      { status: 202, headers: noStoreHeaders },
    );
  }

  const historyStart = new Date(window.windowEnd.getTime() - 7 * DAY_MS);
  const events = await prisma.camCareEvent.findMany({
    where: {
      userId: session.userId,
      deletedAt: null,
      timestamp: { gte: historyStart, lt: window.windowEnd },
    },
    select: { type: true, timestamp: true, data: true },
    orderBy: { timestamp: "asc" },
  });
  const currentEvents = eventsInWindow(
    events,
    window.windowStart,
    window.windowEnd,
  );
  const previousStart = new Date(window.windowStart.getTime() - DAY_MS);
  const previousEvents = eventsInWindow(
    events,
    previousStart,
    window.windowStart,
  );
  const loggedDays = Array.from({ length: 7 }, (_, index) => {
    const end = new Date(window.windowEnd.getTime() - index * DAY_MS);
    const start = new Date(end.getTime() - DAY_MS);
    const dayEvents = eventsInWindow(events, start, end);
    return dayEvents.length ? totalsFor(dayEvents) : null;
  }).filter((day): day is CareTotals => Boolean(day));

  const ageDays = camAgeDays(window.windowEnd);
  const reference = camReferenceForAge(ageDays);
  const current = totalsFor(currentEvents);
  const previous = previousEvents.length ? totalsFor(previousEvents) : null;
  const localFallback = fallbackSuggestion(
    current,
    previous,
    reference.ageLabel,
  );
  const source = {
    reportDate: window.reportDate,
    reportWindow: {
      start: window.windowStart.toISOString(),
      end: window.windowEnd.toISOString(),
    },
    baby: { ageDays, ageGroup: reference.ageLabel },
    current,
    previous,
    recentLoggedDayAverage: averageLoggedDays(loggedDays),
    loggedDaysUsedForAverage: loggedDays.length,
    broadAgeReference: reference,
    caveat:
      "Records may be incomplete. Bottle totals exclude milk taken directly at the breast.",
  };

  if (existing) {
    await prisma.camCareDailyInsight.update({
      where: { id: existing.id },
      data: { status: "generating", source: source as Prisma.InputJsonValue },
    });
  } else {
    try {
      await prisma.camCareDailyInsight.create({
        data: {
          userId: session.userId,
          reportDate: window.reportDate,
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
        const concurrent = await prisma.camCareDailyInsight.findUnique({
          where: {
            userId_reportDate: {
              userId: session.userId,
              reportDate: window.reportDate,
            },
          },
        });
        if (concurrent) {
          return NextResponse.json(
            responsePayload(concurrent, window.nextAvailableAt),
            { status: concurrent.suggestion ? 200 : 202, headers: noStoreHeaders },
          );
        }
      }
      throw error;
    }
  }

  let suggestion = localFallback;
  let status = "fallback";
  let model = "age-based-rules";
  try {
    const generated = await generateOpenAiSuggestion(source);
    if (generated) {
      suggestion = exactlyTwoSentences(generated.text, localFallback);
      status = "ready";
      model = generated.model;
    }
  } catch (error) {
    console.error("[cam-daily-insight] OpenAI suggestion failed", error);
  }

  const saved = await prisma.camCareDailyInsight.update({
    where: {
      userId_reportDate: {
        userId: session.userId,
        reportDate: window.reportDate,
      },
    },
    data: {
      status,
      suggestion,
      model,
      generatedAt: new Date(),
      source: source as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json(responsePayload(saved, window.nextAvailableAt), {
    headers: noStoreHeaders,
  });
}
