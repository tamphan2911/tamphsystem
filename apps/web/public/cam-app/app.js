(() => {
  "use strict";

  const STORAGE_KEY_PREFIX = "littlelog-cam-user";
  const LEGACY_STORAGE_KEYS = ["littlelog-cam-v2", "littlelog-cam-v1"];
  const CAM_API = "/api/cam";
  const BABY = {
    shortName: "Cam",
    fullName: "Phan Hoa Trà",
    sex: "Girl",
    ethnicity: "Vietnamese",
    bornAt: new Date("2026-11-18T08:00:00+07:00"),
    birthWeightKg: 3.4,
    currentWeightKg: null,
    gestationalAgeWeeks: 39.5,
    feedingProfile: "Mostly expressed breast milk by bottle · 2–3 formula feeds daily"
  };
  const WEEK_MS = 7 * 86400000;
  const FIRST_WEEK_GENERATION_AT = new Date("2026-11-25T20:00:00+07:00");
  const OTHER_ACTIVITIES = {
    bath: { type: "bath", title: "Bath", defaultDuration: 10 },
    sunbathing: { type: "sunbathing", title: "Sunbathing", defaultDuration: 15 },
    walk: { type: "walk", title: "Take a walk", defaultDuration: 30 }
  };
  localStorage.removeItem("littlelog-prototype-v1");
  localStorage.removeItem("littlelog-prototype-v2");
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const icons = {
    feed: '<svg viewBox="0 0 24 24"><path d="M9 3h6v3l2 2v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-2V3Zm-2 8h10" /></svg>',
    diaper: '<svg viewBox="0 0 24 24"><path d="M5 5.5v5.2c0 5.1 3.1 8.3 7 8.3s7-3.2 7-8.3V5.5M5.3 8.5c2.2.1 4.1-1 5-3m8.4 3c-2.2.1-4.1-1-5-3M8 16l-3 3m11-3 3 3" /></svg>',
    sleep: '<svg viewBox="0 0 24 24"><path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" /></svg>',
    note: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" /></svg>',
    bottle: '<svg viewBox="0 0 24 24"><path d="M9 3h6v3l2 2v11a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8l2-2V3Zm-2 8h10" /></svg>',
    bath: '<svg viewBox="0 0 24 24"><path d="M4 11h16v3a6 6 0 0 1-6 6h-4a6 6 0 0 1-6-6v-3Zm3 0V6a3 3 0 0 1 6 0m-7 14-1 2m13-2 1 2M13 8h3" /></svg>',
    sunbathing: '<svg viewBox="0 0 24 24"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" /></svg>',
    walk: '<svg viewBox="0 0 24 24"><path d="M13 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-2 4 3-2 2 3 3 1m-8-2-2 5-4 2m6-2 3 2 1 5m-6-7-1 6" /></svg>',
    pump: '<svg viewBox="0 0 24 24"><path d="M8 3h6v5H8zM10 8v3m-3 0h6l2 3v7H5v-7l2-3Zm8-5h3v7h-3m-2-2h2" /></svg>',
    vaccine: '<svg viewBox="0 0 24 24"><path d="M12 3c2.5 2 5.3 2.3 7 2.5v5.8c0 4.6-2.8 7.7-7 9.7-4.2-2-7-5.1-7-9.7V5.5C6.7 5.3 9.5 5 12 3Z" /><path d="M12 9.2c-1.5-1.7-4.3-.7-4.3 1.5 0 2 2.3 3.5 4.3 5 2-1.5 4.3-3 4.3-5 0-2.2-2.8-3.2-4.3-1.5Z" /></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></svg>',
    dirty: '<svg viewBox="0 0 24 24"><path d="M8 18c-2 0-3.5-1.3-3.5-3S6 12 8 12c-.5-2.6 1-5 4-5 2.8 0 4.3 2.3 3.9 4.6 2.2 0 3.6 1.3 3.6 3.2 0 1.8-1.5 3.2-3.7 3.2H8Zm3.8-11c-.2-2 1.1-3.4 3.2-3" /></svg>',
    date: '<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 2v4m8-4v4M5 9h14" /></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="m5 13 4 4L19 7" /></svg>'
  };

  const now = () => new Date();
  const uid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const startOfDay = (date = now()) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dateAtOffset = (days, hour, minute) => {
    const date = startOfDay();
    date.setDate(date.getDate() + days);
    date.setHours(hour, minute, 0, 0);
    return date;
  };
  const relativeToday = (hoursAgo, minutesAgo = 0) => new Date(Date.now() - ((hoursAgo * 60 + minutesAgo) * 60 * 1000));
  const isSameDay = (a, b) => {
    const one = new Date(a);
    const two = new Date(b);
    return one.getFullYear() === two.getFullYear() && one.getMonth() === two.getMonth() && one.getDate() === two.getDate();
  };
  const formatTime = (date) => new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(date));
  const formatDateTime = (date) => new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
  const toLocalDateTimeValue = (date) => {
    const value = new Date(date);
    const local = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };
  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const formatDuration = (minutes) => {
    const total = Math.max(0, Math.round(minutes));
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (!hours) return `${mins}m`;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
  };
  const elapsedText = (date) => {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m ago` : `${hours}h ago`;
  };
  const babyAgeLabel = () => {
    const days = babyAgeDays();
    if (days < 30) return `${days} day${days === 1 ? "" : "s"} old`;
    const months = Math.floor(days / 30);
    const remainingDays = days % 30;
    return `${months} month${months === 1 ? "" : "s"}${remainingDays ? ` ${remainingDays} day${remainingDays === 1 ? "" : "s"}` : ""} old`;
  };
  const babyAgeDays = (at = now()) => Math.max(0, Math.floor((new Date(at).getTime() - BABY.bornAt.getTime()) / 86400000));
  const referenceForAgeDays = (ageDays = babyAgeDays()) => {
    if (ageDays <= 1) return { ageLabel: "first 2 days", feeds: { min: 3, average: 4, max: 6 }, bottleMl: { min: 30, average: 90, max: 180 }, diapers: { min: 2, average: 3, max: 4 }, sleepHours: { min: 14, average: 15.5, max: 17 } };
    if (ageDays <= 3) return { ageLabel: "days 3–4", feeds: { min: 6, average: 9, max: 12 }, bottleMl: { min: 120, average: 240, max: 360 }, diapers: { min: 3, average: 5, max: 7 }, sleepHours: { min: 14, average: 15.5, max: 17 } };
    if (ageDays <= 5) return { ageLabel: "days 5–6", feeds: { min: 8, average: 10, max: 12 }, bottleMl: { min: 240, average: 360, max: 540 }, diapers: { min: 5, average: 7, max: 9 }, sleepHours: { min: 14, average: 15.5, max: 17 } };
    if (ageDays <= 7) return { ageLabel: "full-term first week · mixed expressed milk", feeds: { min: 8, average: 10, max: 12 }, bottleMl: { min: 240, average: 480, max: 720 }, diapers: { min: 6, average: 8, max: 12 }, sleepHours: { min: 14, average: 15.5, max: 17 } };
    if (ageDays <= 30) return { ageLabel: "newborn · 1–4 weeks", feeds: { min: 8, average: 10, max: 12 }, bottleMl: { min: 450, average: 650, max: 850 }, diapers: { min: 6, average: 8, max: 10 }, sleepHours: { min: 14, average: 15.5, max: 17 } };
    if (ageDays <= 120) return { ageLabel: "1–3 months", feeds: { min: 6, average: 8, max: 10 }, bottleMl: { min: 600, average: 750, max: 900 }, diapers: { min: 5, average: 7, max: 9 }, sleepHours: { min: 14, average: 15.5, max: 17 } };
    if (ageDays <= 180) return { ageLabel: "4–6 months", feeds: { min: 5, average: 7, max: 9 }, bottleMl: { min: 700, average: 850, max: 1000 }, diapers: { min: 5, average: 7, max: 9 }, sleepHours: { min: 12, average: 14, max: 16 } };
    if (ageDays <= 365) return { ageLabel: "7–12 months", feeds: { min: 4, average: 5, max: 7 }, bottleMl: { min: 480, average: 650, max: 850 }, diapers: { min: 5, average: 7, max: 9 }, sleepHours: { min: 12, average: 14, max: 16 } };
    return { ageLabel: "12–24 months", feeds: { min: 3, average: 4, max: 5 }, bottleMl: { min: 300, average: 450, max: 600 }, diapers: { min: 4, average: 6, max: 8 }, sleepHours: { min: 11, average: 12.5, max: 14 } };
  };

  function makeEvent(type, title, detail, timestamp, data = {}) {
    return { id: uid(), type, title, detail, timestamp: new Date(timestamp).toISOString(), data };
  }

  function seedState() {
    return {
      events: [],
      activeSessions: {
        sleep: null,
        feed: null,
        other: null
      },
      settings: { dailyReport: true, weeklyReport: true },
      statsPeriod: "today",
      pumpPeriod: "today",
      pumpChartDays: 7,
      deletedEventIds: []
    };
  }

  function loadState(storageKey, allowLegacy = false) {
    try {
      const legacyValue = allowLegacy
        ? LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean)
        : null;
      const saved = JSON.parse(localStorage.getItem(storageKey) || legacyValue);
      if (saved && Array.isArray(saved.events)) {
        saved.activeSessions ||= { sleep: null, feed: null, other: null };
        saved.activeSessions.other ??= null;
        saved.settings ||= { dailyReport: true, weeklyReport: true };
        saved.statsPeriod ||= "today";
        saved.pumpPeriod ||= "today";
        saved.pumpChartDays = Number(saved.pumpChartDays) === 30 ? 30 : 7;
        saved.deletedEventIds = Array.isArray(saved.deletedEventIds) ? saved.deletedEventIds : [];
        return saved;
      }
    } catch (_) {
      // Fall back to a fresh local state.
    }
    return seedState();
  }

  let state = seedState();
  let activeStorageKey = null;
  let currentUser = null;
  let sessionTicker = null;
  let dailyInsight = null;
  let dailyInsightTimer = null;
  let weeklyInsight = null;
  let weeklyInsightTimer = null;
  let syncReady = false;
  let syncChain = Promise.resolve();

  function persistLocalState() {
    if (activeStorageKey) localStorage.setItem(activeStorageKey, JSON.stringify(state));
  }

  function setSyncStatus(mode, message) {
    const text = $("#sync-status-text");
    const badge = $("#sync-status-badge");
    if (text) text.textContent = message;
    if (badge) {
      badge.textContent = mode === "syncing" ? "Syncing" : mode === "pending" ? "Pending" : "Synced";
      badge.dataset.syncState = mode;
    }
  }

  async function camRequest(path, options = {}) {
    const response = await fetch(`${CAM_API}${path}`, {
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "LittleLog could not reach the server.");
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function mergeServerState(serverState, preferLocal = true) {
    const deletedIds = new Set([
      ...(Array.isArray(state.deletedEventIds) ? state.deletedEventIds : []),
      ...(Array.isArray(serverState.deletedEventIds) ? serverState.deletedEventIds : [])
    ]);
    const mergedEvents = new Map();
    const firstEvents = preferLocal ? serverState.events : state.events;
    const secondEvents = preferLocal ? state.events : serverState.events;
    for (const event of Array.isArray(firstEvents) ? firstEvents : []) mergedEvents.set(event.id, event);
    for (const event of Array.isArray(secondEvents) ? secondEvents : []) mergedEvents.set(event.id, event);

    state.events = [...mergedEvents.values()].filter((event) => !deletedIds.has(event.id));
    state.deletedEventIds = [...deletedIds];
    if (!preferLocal || Number(serverState.revision) > 0) {
      state.activeSessions = serverState.activeSessions || { sleep: null, feed: null, other: null };
      state.activeSessions.other ??= null;
      state.settings = serverState.settings || { dailyReport: true, weeklyReport: true };
    }
    persistLocalState();
  }

  function syncSnapshot() {
    if (!syncReady) return;
    const snapshot = JSON.parse(JSON.stringify({
      events: state.events,
      activeSessions: state.activeSessions,
      settings: state.settings,
      deletedEventIds: state.deletedEventIds
    }));

    syncChain = syncChain
      .then(async () => {
        setSyncStatus("syncing", "Syncing with Railway…");
        const serverState = await camRequest("/state", {
          method: "PUT",
          body: JSON.stringify(snapshot)
        });
        mergeServerState(serverState, true);
        setSyncStatus("synced", "Secure Railway sync");
      })
      .catch(() => {
        setSyncStatus("pending", "Saved locally · sync pending");
      });
  }

  function saveState() {
    persistLocalState();
    syncSnapshot();
  }

  async function refreshFromServer() {
    if (!syncReady) return;
    await syncChain;
    try {
      const serverState = await camRequest("/state");
      mergeServerState(serverState, false);
      renderAll();
      setSyncStatus("synced", "Secure Railway sync");
    } catch (error) {
      if (error.status === 401) {
        window.location.reload();
        return;
      }
      setSyncStatus("pending", "Saved locally · sync pending");
    }
  }

  function eventsSince(days) {
    const currentWindow = currentCareWindow();
    const cutoff = new Date(currentWindow.start);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const currentTime = now();
    return state.events.filter((event) => !["vaccine", "pump"].includes(event.type) && new Date(event.timestamp) >= cutoff && new Date(event.timestamp) <= currentTime);
  }

  function eventsForToday() {
    const window = currentCareWindow();
    return state.events.filter((event) => {
      const recordedAt = new Date(event.timestamp);
      return !["vaccine", "pump"].includes(event.type) && recordedAt >= window.start && recordedAt < window.end && recordedAt <= now();
    });
  }

  function dailyReportEvents(dayOffset = 0) {
    const windowEnd = startOfDay();
    windowEnd.setDate(windowEnd.getDate() + dayOffset);
    windowEnd.setHours(20, 0, 0, 0);
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 1);
    return state.events.filter((event) => {
      const recordedAt = new Date(event.timestamp);
      return !["vaccine", "pump"].includes(event.type) && recordedAt >= windowStart && recordedAt < windowEnd;
    });
  }

  function currentBabyWeek(at = now()) {
    const elapsed = Math.max(0, new Date(at).getTime() - BABY.bornAt.getTime());
    const index = Math.floor(elapsed / WEEK_MS);
    const start = new Date(BABY.bornAt.getTime() + index * WEEK_MS);
    return { weekNumber: index + 1, start, end: new Date(start.getTime() + WEEK_MS) };
  }

  function babyWeekGenerationAt(weekNumber) {
    return new Date(FIRST_WEEK_GENERATION_AT.getTime() + (weekNumber - 1) * WEEK_MS);
  }

  function weeklyDisplayWindow() {
    if (weeklyInsight?.weekNumber && weeklyInsight.windowStart && weeklyInsight.windowEnd) {
      return {
        weekNumber: weeklyInsight.weekNumber,
        start: new Date(weeklyInsight.windowStart),
        end: new Date(weeklyInsight.windowEnd)
      };
    }
    return currentBabyWeek();
  }

  function eventsForWindow(start, end) {
    const upperBound = Math.min(new Date(end).getTime(), Date.now());
    return state.events.filter((event) => {
      const recordedAt = new Date(event.timestamp).getTime();
      return !["vaccine", "pump"].includes(event.type) && recordedAt >= new Date(start).getTime() && recordedAt < upperBound;
    });
  }

  function currentCareWindow(at = now()) {
    const current = new Date(at);
    const start = startOfDay(current);
    start.setHours(20, 0, 0, 0);
    if (current < start) start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  function careWindowAtOffset(offset = 0, at = now()) {
    const window = currentCareWindow(at);
    const start = new Date(window.start);
    const end = new Date(window.end);
    start.setDate(start.getDate() + offset);
    end.setDate(end.getDate() + offset);
    return { start, end };
  }

  function eventsInCareWindow(window, predicate = () => true) {
    const upperBound = Math.min(window.end.getTime(), Date.now());
    return state.events.filter((event) => {
      const recordedAt = new Date(event.timestamp).getTime();
      return recordedAt >= window.start.getTime() && recordedAt < upperBound && predicate(event);
    });
  }

  function eventsForCareDay() {
    return eventsInCareWindow(currentCareWindow(), (event) => event.type !== "vaccine");
  }

  function iconFor(type) {
    return icons[type] || icons.note;
  }

  function timeRangeFor(event) {
    if (!["feed", "sleep", "bath", "sunbathing", "walk", "pump"].includes(event.type)) return "";
    const durationMin = Number(event.data?.durationMin || 0);
    const end = new Date(event.data?.endAt || event.timestamp);
    const start = event.data?.startAt
      ? new Date(event.data.startAt)
      : new Date(end.getTime() - durationMin * 60000);
    if (!durationMin || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
    return `${formatTime(start)}–${formatTime(end)}`;
  }

  function timelineInterval(event) {
    const end = new Date(event.data?.endAt || event.timestamp);
    const durationMin = Number(event.data?.durationMin || 0);
    const start = event.data?.startAt
      ? new Date(event.data.startAt)
      : new Date(end.getTime() - durationMin * 60000);
    const timed = ["feed", "sleep", "bath", "sunbathing", "walk", "pump"].includes(event.type)
      && durationMin > 0
      && !Number.isNaN(start.getTime())
      && !Number.isNaN(end.getTime())
      && end > start;
    return { start: timed ? start : end, end, timed };
  }

  function timelineDayPart(date) {
    const hour = new Date(date).getHours();
    return hour >= 20 || hour < 6 ? "night" : "day";
  }

  function timelineEventsFor(predicate) {
    const currentWindow = currentCareWindow();
    const currentEvents = eventsInCareWindow(currentWindow, predicate);
    if (currentEvents.length) return { events: currentEvents, window: currentWindow, fallback: false };
    const previousWindow = careWindowAtOffset(-1);
    return { events: eventsInCareWindow(previousWindow, predicate), window: previousWindow, fallback: true };
  }

  function timelineCheckpoints(events, window, includeFollowingBoundary = false) {
    if (!events.length) return [];
    const intervals = events.map(timelineInterval);
    const firstTime = Math.min(...intervals.map((interval) => interval.start.getTime()));
    const lastEventTime = Math.max(...intervals.map((interval) => interval.end.getTime()));
    const lastTime = includeFollowingBoundary ? Math.max(lastEventTime, Date.now()) : lastEventTime;
    const { start, end } = window;
    const midnight = new Date(start);
    midnight.setHours(midnight.getHours() + 4);
    const dayStart = new Date(start);
    dayStart.setHours(dayStart.getHours() + 10);
    const midnightDate = new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short" }).format(midnight);
    return [
      { date: start, kind: "night", label: "8:00 PM · Night time begins" },
      { date: midnight, kind: "date", label: `12:00 AM · ${midnightDate}` },
      { date: dayStart, kind: "day", label: "6:00 AM · Day time begins" },
      { date: end, kind: "night", label: "8:00 PM · Night time begins" }
    ].filter((checkpoint) => firstTime < checkpoint.date.getTime() && lastTime > checkpoint.date.getTime());
  }

  function splitTimelineEvent(event, checkpoints) {
    const interval = timelineInterval(event);
    if (!interval.timed) {
      return [{ ...event, timelineKind: timelineDayPart(interval.end), timelineSortTime: interval.end.getTime() }];
    }
    const boundaries = checkpoints
      .map((checkpoint) => checkpoint.date)
      .filter((date) => date > interval.start && date < interval.end)
      .sort((a, b) => a - b);
    const points = [interval.start, ...boundaries, interval.end];
    return points.slice(0, -1).map((partStart, index) => {
      const partEnd = points[index + 1];
      const startsAtCheckpoint = index > 0;
      const endsAtCheckpoint = index < points.length - 2;
      let displayStart = new Date(partStart.getTime() + (startsAtCheckpoint ? 60000 : 0));
      let displayEnd = new Date(partEnd.getTime() - (endsAtCheckpoint ? 60000 : 0));
      if (displayEnd <= displayStart) {
        displayStart = new Date(partStart);
        displayEnd = new Date(partEnd);
      }
      const durationMin = Math.max(1, Math.round((displayEnd - displayStart) / 60000));
      const midpoint = new Date((displayStart.getTime() + displayEnd.getTime()) / 2);
      return {
        ...event,
        timestamp: displayEnd.toISOString(),
        data: {
          ...event.data,
          durationMin,
          startAt: displayStart.toISOString(),
          endAt: displayEnd.toISOString()
        },
        timelineKind: timelineDayPart(midpoint),
        timelineSortTime: displayEnd.getTime()
      };
    });
  }

  function createTimelineItem(event) {
    const item = document.createElement("article");
    item.className = `timeline-item ${event.timelineKind || timelineDayPart(event.timestamp)}`;

    const icon = document.createElement("span");
    const isDirty = event.type === "diaper" && event.data?.kind === "dirty";
    icon.className = `timeline-icon ${event.type}${isDirty ? " dirty" : ""}`;
    icon.innerHTML = isDirty ? icons.dirty : iconFor(event.type);

    const main = document.createElement("button");
    main.className = "timeline-main";
    main.type = "button";
    main.dataset.eventId = event.id;
    const copy = document.createElement("span");
    copy.className = "timeline-copy";
    const heading = document.createElement("span");
    heading.className = "timeline-entry-heading";
    const title = document.createElement("strong");
    title.textContent = event.title;
    const time = document.createElement("span");
    time.className = "timeline-time";
    const durationMin = Number(event.data?.durationMin || 0);
    const timedTypes = ["feed", "sleep", "bath", "sunbathing", "walk"];
    time.textContent = durationMin && timedTypes.includes(event.type)
      ? formatDuration(durationMin)
      : formatTime(event.timestamp);
    heading.append(title);
    if (event.type !== "diaper") heading.append(time);
    const detail = document.createElement("small");
    const timeRange = timeRangeFor(event);
    const noteText = event.type === "note" ? "" : String(event.data?.note || "").trim();
    let detailText = event.detail || "No extra details";
    if (event.type === "diaper") {
      detailText = formatTime(event.timestamp);
    } else if (event.type === "feed" && event.data?.mode === "bottle") {
      detailText = [event.data?.milk, `${Number(event.data?.amount || 0)} ml`, timeRange].filter(Boolean).join(" · ");
    } else if (event.type === "feed") {
      detailText = [event.data?.side, timeRange].filter(Boolean).join(" · ");
    } else if (["sleep", "bath", "sunbathing", "walk"].includes(event.type)) {
      detailText = timeRange;
    }
    detail.className = "timeline-detail";
    detail.textContent = detailText;
    copy.append(heading);
    if (detailText) copy.append(detail);
    if (noteText) {
      const note = document.createElement("small");
      note.className = "timeline-note";
      note.textContent = noteText;
      copy.append(note);
    }
    main.append(copy);

    const edit = document.createElement("button");
    edit.className = "timeline-edit";
    edit.type = "button";
    edit.dataset.editEventId = event.id;
    edit.setAttribute("aria-label", `Edit ${event.title}`);
    edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.3 2.3 0 0 0-3.2-3.2L4.8 16.8 4 16Zm10-8 3.2 3.2" /></svg>';
    item.append(icon, main, edit);
    return item;
  }

  function renderTimeline() {
    const timeline = $("#timeline");
    const timelineData = timelineEventsFor((event) => !["vaccine", "pump"].includes(event.type));
    const events = timelineData.events;
    const checkpoints = timelineCheckpoints(events, timelineData.window, timelineData.fallback);
    timeline.replaceChildren();
    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "timeline-empty";
      empty.textContent = "No activity logged in this care day yet.";
      timeline.appendChild(empty);
      return;
    }
    const rows = [
      ...events.flatMap((event) => splitTimelineEvent(event, checkpoints)).map((event) => ({ type: "activity", time: event.timelineSortTime, event })),
      ...checkpoints.map((checkpoint) => ({ type: "checkpoint", time: checkpoint.date.getTime(), checkpoint }))
    ].sort((a, b) => b.time - a.time || (a.type === "activity" ? -1 : 1));
    rows.forEach((row) => {
      if (row.type === "activity") {
        timeline.appendChild(createTimelineItem(row.event));
        return;
      }
      const checkpoint = document.createElement("div");
      checkpoint.className = `timeline-checkpoint ${row.checkpoint.kind}`;
      const checkpointIcon = row.checkpoint.kind === "day" ? icons.sunbathing : row.checkpoint.kind === "date" ? icons.date : icons.sleep;
      checkpoint.innerHTML = `${checkpointIcon}<span>${row.checkpoint.label}</span>`;
      timeline.appendChild(checkpoint);
    });
  }

  function totalsFor(events) {
    const feeds = events.filter((event) => event.type === "feed");
    const diapers = events.filter((event) => event.type === "diaper");
    const sleep = events.filter((event) => event.type === "sleep");
    const baths = events.filter((event) => event.type === "bath");
    const sunbathing = events.filter((event) => event.type === "sunbathing");
    const walks = events.filter((event) => event.type === "walk");
    const bottles = feeds.filter((event) => event.data?.mode === "bottle");
    return {
      feeds: feeds.length,
      bottles: bottles.reduce((sum, event) => sum + Number(event.data?.amount || 0), 0),
      breastMilk: bottles.filter((event) => event.data?.milk === "Expressed milk").reduce((sum, event) => sum + Number(event.data?.amount || 0), 0),
      formula: bottles.filter((event) => event.data?.milk === "Formula").reduce((sum, event) => sum + Number(event.data?.amount || 0), 0),
      wet: diapers.filter((event) => event.data?.kind === "wet").length,
      dirty: diapers.filter((event) => event.data?.kind === "dirty").length,
      diapers: diapers.length,
      sleepMinutes: sleep.reduce((sum, event) => sum + Number(event.data?.durationMin || 0), 0),
      baths: baths.length,
      sunbathing: sunbathing.length,
      walks: walks.length
    };
  }

  function renderLastFeed() {
    const feed = state.events
      .filter((event) => event.type === "feed")
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    if (!feed) {
      $("#last-feed-text").textContent = "No feed logged";
      $("#last-feed-detail").textContent = "Tap Feed to begin";
      return;
    }
    $("#last-feed-text").textContent = elapsedText(feed.timestamp);
    $("#last-feed-detail").textContent = feed.detail;
  }

  function activeSleepMinutes(window = currentCareWindow()) {
    if (!state.activeSessions?.sleep) return 0;
    const startedAt = Math.max(new Date(state.activeSessions.sleep.startedAt).getTime(), window.start.getTime());
    const endedAt = Math.min(Date.now(), window.end.getTime());
    return Math.max(0, (endedAt - startedAt) / 60000);
  }

  function renderTodaySignals() {
    const totals = totalsFor(eventsForToday());
    const reference = referenceForAgeDays();
    const sleepMinutes = totals.sleepMinutes + activeSleepMinutes();
    const milkMl = totals.breastMilk + totals.formula;
    const countScaleMax = (range, value) => Math.ceil(Math.max(range.max + 4, range.max * 1.35, value * 1.1) / 2) * 2;
    const milkScaleMax = Math.ceil(Math.max(reference.bottleMl.max + 200, reference.bottleMl.max * 1.35, milkMl * 1.1) / 100) * 100;
    const sleepScaleMax = Math.ceil(Math.max(24, (sleepMinutes / 60) * 1.1) / 2) * 2;
    const comparisons = [
      { key: "feeds", label: "Feeds", value: totals.feeds, range: reference.feeds, scaleMax: countScaleMax(reference.feeds, totals.feeds), display: `${Math.round(totals.feeds)} / day`, average: `${reference.feeds.average} / day`, format: (value) => `${value}` },
      { key: "milk", label: "Milk", value: milkMl, range: reference.bottleMl, scaleMax: milkScaleMax, display: `${Math.round(milkMl)} ml`, average: `${reference.bottleMl.average} ml`, format: (value) => `${Math.round(value).toLocaleString()} ml` },
      { key: "diapers", label: "Diapers", value: totals.diapers, range: reference.diapers, scaleMax: countScaleMax(reference.diapers, totals.diapers), display: `${Math.round(totals.diapers)} / day`, average: `${reference.diapers.average} / day`, format: (value) => `${value}` },
      { key: "sleep", label: "Sleep", value: sleepMinutes / 60, range: reference.sleepHours, scaleMax: sleepScaleMax, display: formatDuration(sleepMinutes), average: `${reference.sleepHours.average}h`, format: (value) => `${value}h` }
    ];
    $("#comparison-list").innerHTML = comparisons.map((item) => {
      const position = Math.max(0, Math.min(100, (item.value / item.scaleMax) * 100));
      const typicalStart = Math.max(0, Math.min(100, (item.range.min / item.scaleMax) * 100));
      const typicalEnd = Math.max(typicalStart, Math.min(100, (item.range.max / item.scaleMax) * 100));
      return `<div class="comparison-row signal-${item.key}"><div class="comparison-heading"><span class="comparison-label"><strong>${item.label}</strong><i aria-hidden="true"></i><small>Reference average ${item.average}</small></span><strong class="comparison-current">${item.display}</strong></div><div class="comparison-track-wrap"><span class="comparison-track" role="img" aria-label="${item.label}: ${item.display}; reference ${item.format(item.range.min)} to ${item.format(item.range.max)}; scale zero to ${item.format(item.scaleMax)}" style="--cam-position:${position}%;--typical-start:${typicalStart}%;--typical-width:${typicalEnd - typicalStart}%;--typical-end:${typicalEnd}%"><span class="comparison-zone range-below"></span><span class="comparison-zone range-reference"></span><span class="comparison-zone range-above"></span><i class="range-start"></i><i class="range-end"></i><i class="comparison-pin" title="${BABY.shortName}: ${item.display}"></i></span><span class="comparison-scale"><span>${item.format(0)}</span><span>Reference ${item.format(item.range.min)}–${item.format(item.range.max)}</span><span>${item.format(item.scaleMax)}</span></span></div></div>`;
    }).join("");
  }

  function statsTrendDays(dayCount) {
    const days = [];
    for (let offset = -(dayCount - 1); offset <= 0; offset += 1) {
      const window = careWindowAtOffset(offset);
      if (window.end <= BABY.bornAt) continue;
      const dayEvents = eventsInCareWindow(window, (event) => !["vaccine", "pump"].includes(event.type));
      const totals = totalsFor(dayEvents);
      const activeSleep = offset === 0 ? activeSleepMinutes(window) : 0;
      const reference = referenceForAgeDays(babyAgeDays(window.end));
      days.push({
        date: new Date(window.end),
        window,
        current: offset === 0,
        reference,
        feeds: totals.feeds,
        milk: totals.breastMilk + totals.formula,
        diapers: totals.diapers,
        sleep: (totals.sleepMinutes + activeSleep) / 60,
        feedsLogged: dayEvents.some((event) => event.type === "feed"),
        milkLogged: dayEvents.some((event) => event.type === "feed" && event.data?.mode === "bottle" && Number(event.data?.amount || 0) > 0),
        diapersLogged: dayEvents.some((event) => event.type === "diaper"),
        sleepLogged: dayEvents.some((event) => event.type === "sleep") || activeSleep > 0
      });
    }
    return days;
  }

  function trendReferenceBand(days, rangeFor, x, y) {
    if (!days.length) return "";
    let path = `M ${x(0)} ${y(rangeFor(days[0]).max)}`;
    for (let index = 1; index < days.length; index += 1) {
      const midpoint = (x(index - 1) + x(index)) / 2;
      path += ` L ${midpoint} ${y(rangeFor(days[index - 1]).max)} L ${midpoint} ${y(rangeFor(days[index]).max)} L ${x(index)} ${y(rangeFor(days[index]).max)}`;
    }
    path += ` L ${x(days.length - 1)} ${y(rangeFor(days[days.length - 1]).min)}`;
    for (let index = days.length - 2; index >= 0; index -= 1) {
      const midpoint = (x(index) + x(index + 1)) / 2;
      path += ` L ${midpoint} ${y(rangeFor(days[index + 1]).min)} L ${midpoint} ${y(rangeFor(days[index]).min)} L ${x(index)} ${y(rangeFor(days[index]).min)}`;
    }
    return `${path} Z`;
  }

  function renderSignalTrend(metric, days, requestedDays) {
    const width = 330;
    const height = 178;
    const plot = { left: 34, right: 8, top: 9, bottom: 29 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const rangeFor = (day) => day.reference[metric.rangeKey];
    const observed = days.filter((day) => day[metric.loggedKey]).map((day) => day[metric.key]);
    const rawMax = Math.max(1, ...observed, ...days.map((day) => rangeFor(day).max));
    const scaleMax = metric.scaleMax(rawMax);
    const x = (index) => plot.left + (index / Math.max(1, days.length - 1)) * plotWidth;
    const y = (value) => plot.top + plotHeight - (Math.max(0, value) / scaleMax) * plotHeight;
    let linePath = "";
    let previousIndex = null;
    days.forEach((day, index) => {
      if (!day[metric.loggedKey]) { previousIndex = null; return; }
      linePath += `${previousIndex === index - 1 ? " L" : " M"} ${x(index)} ${y(day[metric.key])}`;
      previousIndex = index;
    });
    const grid = [0, .25, .5, .75, 1].map((ratio) => {
      const value = scaleMax * ratio;
      const gridY = y(value);
      return `<line class="signal-chart-grid" x1="${plot.left}" y1="${gridY}" x2="${width - plot.right}" y2="${gridY}" /><text class="signal-chart-axis" x="${plot.left - 5}" y="${gridY + 3}" text-anchor="end">${metric.axisFormat(value)}</text>`;
    }).join("");
    const labelEvery = days.length <= 8 ? 1 : Math.max(1, Math.floor((days.length - 1) / 5));
    const dateLabels = days.map((day, index) => {
      if (index % labelEvery && index !== days.length - 1) return "";
      const label = day.current ? "Today" : new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(day.date);
      return `<text class="signal-chart-date" x="${x(index)}" y="${height - 8}" text-anchor="middle">${label}</text>`;
    }).join("");
    const points = days.map((day, index) => {
      if (!day[metric.loggedKey]) return "";
      const dateLabel = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(day.date);
      return `<circle class="signal-chart-point" cx="${x(index)}" cy="${y(day[metric.key])}" r="3"><title>${dateLabel} · ${metric.valueFormat(day[metric.key])}</title></circle>`;
    }).join("");
    const currentRange = rangeFor(days[days.length - 1]);
    const hasValues = observed.length > 0;
    return `<article class="signal-trend-card signal-trend-${metric.key}"><header class="signal-trend-heading"><strong>${metric.label}</strong><span><i></i>Reference ${metric.valueFormat(currentRange.min)}–${metric.valueFormat(currentRange.max)}</span></header><div class="signal-line-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.label} over the available days in the last ${requestedDays} days, with an age-adjusted reference range">${grid}<path class="signal-reference-band" d="${trendReferenceBand(days, rangeFor, x, y)}" />${linePath ? `<path class="signal-chart-line" d="${linePath.trim()}" />` : ""}${points}${dateLabels}${hasValues ? "" : `<text class="signal-chart-empty" x="${plot.left + plotWidth / 2}" y="${plot.top + plotHeight / 2}" text-anchor="middle">No logged ${metric.label.toLowerCase()} yet</text>`}</svg></div></article>`;
  }

  function renderTrendSignals(dayCount) {
    const days = statsTrendDays(dayCount);
    const metrics = [
      { key: "feeds", loggedKey: "feedsLogged", rangeKey: "feeds", label: "Feeds", scaleMax: (max) => Math.ceil(max * 1.2 / 2) * 2, axisFormat: (value) => `${Math.round(value)}`, valueFormat: (value) => `${Number(value.toFixed(1))} / day` },
      { key: "milk", loggedKey: "milkLogged", rangeKey: "bottleMl", label: "Milk", scaleMax: (max) => Math.ceil(max * 1.15 / 100) * 100, axisFormat: (value) => `${Math.round(value)}`, valueFormat: (value) => `${Math.round(value)} ml` },
      { key: "diapers", loggedKey: "diapersLogged", rangeKey: "diapers", label: "Diapers", scaleMax: (max) => Math.ceil(max * 1.2 / 2) * 2, axisFormat: (value) => `${Math.round(value)}`, valueFormat: (value) => `${Number(value.toFixed(1))} / day` },
      { key: "sleep", loggedKey: "sleepLogged", rangeKey: "sleepHours", label: "Sleep", scaleMax: (max) => Math.max(24, Math.ceil(max * 1.1 / 2) * 2), axisFormat: (value) => `${Number(value.toFixed(1))}h`, valueFormat: (value) => `${Number(value.toFixed(1))}h` }
    ];
    $("#stats-trend-charts").innerHTML = metrics.map((metric) => renderSignalTrend(metric, days, dayCount)).join("");
  }

  function renderStats() {
    const todaySelected = state.statsPeriod === "today";
    $("#stats-today-panel").classList.toggle("hidden", !todaySelected);
    $("#stats-trend-panel").classList.toggle("hidden", todaySelected);
    if (todaySelected) renderTodaySignals();
    else renderTrendSignals(state.statsPeriod === "month" ? 30 : 7);
  }

  function renderCharts() {
    renderStats();
  }

  function pumpEventsForCareDay() {
    return eventsInCareWindow(currentCareWindow(), (event) => event.type === "pump")
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  function pumpEventsSince(days) {
    const cutoff = new Date(currentCareWindow().start);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    return state.events.filter((event) => event.type === "pump" && new Date(event.timestamp) >= cutoff && new Date(event.timestamp) <= now());
  }

  function pumpEventsForPeriod() {
    if (state.pumpPeriod === "month") return pumpEventsSince(30);
    if (state.pumpPeriod === "week") return pumpEventsSince(7);
    return pumpEventsForCareDay();
  }

  function pumpTotals(events) {
    return events.reduce((totals, event) => {
      const leftMl = Number(event.data?.leftMl || 0);
      const rightMl = Number(event.data?.rightMl || 0);
      totals.count += 1;
      totals.durationMin += Number(event.data?.durationMin || 0);
      totals.leftMl += leftMl;
      totals.rightMl += rightMl;
      totals.totalMl += Number(event.data?.totalMl || leftMl + rightMl);
      return totals;
    }, { count: 0, durationMin: 0, leftMl: 0, rightMl: 0, totalMl: 0 });
  }

  function renderPumpTimeline() {
    const timeline = $("#pump-timeline");
    const timelineData = timelineEventsFor((event) => event.type === "pump");
    const events = timelineData.events;
    $("#pump-timeline-window").textContent = timelineData.fallback && events.length ? "Previous care day" : "Current care day";
    if (!events.length) {
      timeline.innerHTML = '<div class="pump-timeline-empty">No milk pumping has been logged in this care day yet.</div>';
      return;
    }
    const checkpoints = timelineCheckpoints(events, timelineData.window, timelineData.fallback);
    const rows = [
      ...events.flatMap((event) => splitTimelineEvent(event, checkpoints)).map((event) => ({ type: "activity", time: event.timelineSortTime, event })),
      ...checkpoints.map((checkpoint) => ({ type: "checkpoint", time: checkpoint.date.getTime(), checkpoint }))
    ].sort((a, b) => b.time - a.time || (a.type === "activity" ? -1 : 1));
    timeline.innerHTML = rows.map((row) => {
      if (row.type === "checkpoint") {
        const checkpointIcon = row.checkpoint.kind === "day" ? icons.sunbathing : row.checkpoint.kind === "date" ? icons.date : icons.sleep;
        return `<div class="timeline-checkpoint pump-timeline-checkpoint ${row.checkpoint.kind}">${checkpointIcon}<span>${row.checkpoint.label}</span></div>`;
      }
      const event = row.event;
      const leftMl = Number(event.data?.leftMl || 0);
      const rightMl = Number(event.data?.rightMl || 0);
      const durationMin = Number(event.data?.durationMin || 0);
      const note = String(event.data?.note || "").trim();
      return `<article class="pump-entry"><div class="pump-entry-head"><span class="pump-entry-icon">${icons.pump}</span><button class="pump-entry-title" data-pump-event-id="${event.id}" type="button"><strong>Milk pump</strong><small>${formatTime(event.timestamp)} · ${formatDuration(durationMin)}</small></button><span class="pump-entry-actions"><button class="pump-entry-edit" data-edit-pump-id="${event.id}" type="button" aria-label="Edit milk pump"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.3 2.3 0 0 0-3.2-3.2L4.8 16.8 4 16Zm10-8 3.2 3.2" /></svg></button></span></div><div class="pump-sides"><span class="pump-side left"><small>Left breast</small><strong>${leftMl} ml</strong></span><span class="pump-side right"><small>Right breast</small><strong>${rightMl} ml</strong></span></div>${note ? `<p class="pump-entry-note">${escapeHtml(note)}</p>` : ""}</article>`;
    }).join("");
  }

  function renderPumpSummary() {
    const events = pumpEventsForPeriod();
    const totals = pumpTotals(events);
    const divisor = Math.max(1, totals.count);
    const averageDuration = totals.count ? totals.durationMin / divisor : 0;
    const averageLeft = totals.count ? totals.leftMl / divisor : 0;
    const averageRight = totals.count ? totals.rightMl / divisor : 0;
    $("#pump-summary").innerHTML = `<div class="pump-overview"><span><small>Number of pumps</small><strong>${totals.count}</strong></span><span><small>Average duration</small><strong>${formatDuration(averageDuration)}</strong></span><span><small>Total duration</small><strong>${formatDuration(totals.durationMin)}</strong></span></div><div class="pump-side-summary"><article><h4>Left breast</h4><div><small>Total pumped</small><strong>${Math.round(totals.leftMl)} ml</strong></div><div><small>Average / pump</small><strong>${Math.round(averageLeft)} ml</strong></div></article><article><h4>Right breast</h4><div><small>Total pumped</small><strong>${Math.round(totals.rightMl)} ml</strong></div><div><small>Average / pump</small><strong>${Math.round(averageRight)} ml</strong></div></article></div>`;
  }

  function renderPumpChart() {
    const dayCount = Number(state.pumpChartDays) === 30 ? 30 : 7;
    const days = [];
    for (let offset = -(dayCount - 1); offset <= 0; offset += 1) {
      const window = careWindowAtOffset(offset);
      if (window.end <= BABY.bornAt) continue;
      const dayEvents = eventsInCareWindow(window);
      const pumped = pumpTotals(dayEvents.filter((event) => event.type === "pump")).totalMl;
      const fed = dayEvents
        .filter((event) => event.type === "feed" && event.data?.mode === "bottle")
        .reduce((sum, event) => sum + Number(event.data?.amount || 0), 0);
      days.push({ date: new Date(window.end), pumped, fed });
    }
    const width = 330;
    const height = 190;
    const plot = { left: 42, right: 8, top: 12, bottom: 30 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const observedMax = Math.max(0, ...days.flatMap((day) => [day.pumped, day.fed]));
    const scaleMax = Math.max(100, Math.ceil(observedMax / 100) * 100);
    const x = (index) => plot.left + (index / Math.max(1, days.length - 1)) * plotWidth;
    const y = (value) => plot.top + plotHeight - (value / scaleMax) * plotHeight;
    const pumpedPoints = days.map((day, index) => `${x(index).toFixed(1)},${y(day.pumped).toFixed(1)}`).join(" ");
    const fedPoints = days.map((day, index) => `${x(index).toFixed(1)},${y(day.fed).toFixed(1)}`).join(" ");
    const grid = [0, .25, .5, .75, 1].map((ratio) => {
      const value = Math.round(scaleMax * ratio);
      const gridY = y(value);
      return `<line class="chart-grid" x1="${plot.left}" y1="${gridY}" x2="${width - plot.right}" y2="${gridY}" /><text class="chart-axis-label" x="${plot.left - 6}" y="${gridY + 3}" text-anchor="end">${value}</text>`;
    }).join("");
    const labelEvery = dayCount === 7 ? 1 : 5;
    const labels = days.map((day, index) => {
      if (index % labelEvery && index !== days.length - 1) return "";
      const label = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(day.date);
      return `<text class="chart-date-label" x="${x(index)}" y="${height - 8}" text-anchor="middle">${label}</text>`;
    }).join("");
    const points = days.map((day, index) => {
      const label = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(day.date);
      return `<circle class="pump-point" cx="${x(index)}" cy="${y(day.pumped)}" r="${dayCount === 7 ? 3 : 2}"><title>${label} · ${day.pumped} ml pumped</title></circle><circle class="fed-point" cx="${x(index)}" cy="${y(day.fed)}" r="${dayCount === 7 ? 3 : 2}"><title>${label} · ${day.fed} ml fed</title></circle>`;
    }).join("");
    $("#pump-chart-window").textContent = `Last ${dayCount} care days · ending today`;
    $("#pump-line-chart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily milk pumped and milk fed in millilitres over the last ${dayCount} care days">${grid}<polyline class="pump-line" points="${pumpedPoints}" /><polyline class="fed-line" points="${fedPoints}" />${points}${labels}<text class="chart-unit-label" x="8" y="10">ml</text></svg>`;
  }

  function renderPumpSessionChart() {
    const colors = ["#6b59d3", "#ef7467", "#3aa88d"];
    const series = [-2, -1, 0].map((offset, index) => {
      const window = careWindowAtOffset(offset);
      const events = eventsInCareWindow(window, (event) => event.type === "pump")
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        window,
        events,
        color: colors[index],
        label: new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(window.end)
      };
    });
    const width = 330;
    const height = 205;
    const plot = { left: 42, right: 57, top: 13, bottom: 33 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const observedMax = Math.max(0, ...series.flatMap((day) => day.events.map((event) => Number(event.data?.totalMl || Number(event.data?.leftMl || 0) + Number(event.data?.rightMl || 0)))));
    const scaleMax = Math.max(100, Math.ceil(observedMax / 50) * 50);
    const x = (hours) => plot.left + (Math.max(0, Math.min(24, hours)) / 24) * plotWidth;
    const y = (value) => plot.top + plotHeight - (Math.max(0, value) / scaleMax) * plotHeight;
    const grid = [0, .25, .5, .75, 1].map((ratio) => {
      const value = Math.round(scaleMax * ratio);
      const gridY = y(value);
      return `<line class="session-chart-grid" x1="${plot.left}" y1="${gridY}" x2="${width - plot.right}" y2="${gridY}" /><text class="session-chart-axis" x="${plot.left - 6}" y="${gridY + 3}" text-anchor="end">${value}</text>`;
    }).join("");
    const hourTicks = [
      { hour: 0, label: "8 PM" }, { hour: 4, label: "12 AM" }, { hour: 8, label: "4 AM" },
      { hour: 12, label: "8 AM" }, { hour: 16, label: "12 PM" }, { hour: 20, label: "4 PM" }, { hour: 24, label: "8 PM" }
    ].map((tick) => `<line class="session-chart-tick" x1="${x(tick.hour)}" y1="${plot.top}" x2="${x(tick.hour)}" y2="${plot.top + plotHeight}" /><text class="session-chart-date" x="${x(tick.hour)}" y="${height - 9}" text-anchor="middle">${tick.label}</text>`).join("");
    const usedLabelY = [];
    const lines = series.map((day, seriesIndex) => {
      const points = day.events.map((event) => {
        const timestamp = new Date(event.timestamp);
        const hours = (timestamp.getTime() - day.window.start.getTime()) / 3600000;
        const totalMl = Number(event.data?.totalMl || Number(event.data?.leftMl || 0) + Number(event.data?.rightMl || 0));
        return { x: x(hours), y: y(totalMl), totalMl, timestamp };
      });
      const path = points.length ? `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")}` : "";
      const dots = points.map((point) => `<circle class="session-chart-point" style="--series-color:${day.color}" cx="${point.x}" cy="${point.y}" r="3.3"><title>${formatTime(point.timestamp)} · ${point.totalMl} ml</title></circle>`).join("");
      let labelY = points.length ? points[points.length - 1].y : plot.top + 14 + seriesIndex * 18;
      while (usedLabelY.some((used) => Math.abs(used - labelY) < 13)) labelY += 13;
      labelY = Math.min(plot.top + plotHeight - 3, labelY);
      usedLabelY.push(labelY);
      const leaderStart = points.length ? points[points.length - 1].x + 4 : width - plot.right;
      return `${path ? `<path class="session-chart-line" style="--series-color:${day.color}" d="${path}" />` : ""}${dots}<line class="session-chart-leader" style="--series-color:${day.color}" x1="${leaderStart}" y1="${labelY}" x2="${width - 42}" y2="${labelY}" /><text class="session-chart-count" style="--series-color:${day.color}" x="${width - 3}" y="${labelY + 3}" text-anchor="end">${day.events.length} pump${day.events.length === 1 ? "" : "s"}</text>`;
    }).join("");
    $("#pump-session-legend").innerHTML = series.map((day) => `<span><i style="background:${day.color}"></i>${day.label}</span>`).join("");
    $("#pump-session-chart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Total millilitres for each pump by time across three care days">${grid}${hourTicks}${lines}<text class="session-chart-unit" x="8" y="10">ml</text></svg>`;
  }

  function renderPump() {
    $$('[data-pump-period]').forEach((button) => button.classList.toggle("active", button.dataset.pumpPeriod === state.pumpPeriod));
    $$('[data-pump-chart-days]').forEach((button) => button.classList.toggle("active", Number(button.dataset.pumpChartDays) === Number(state.pumpChartDays)));
    renderPumpTimeline();
    renderPumpSummary();
    renderPumpChart();
    renderPumpSessionChart();
  }

  function renderReports() {
    const today = totalsFor(dailyReportEvents());
    const previous = totalsFor(dailyReportEvents(-1));
    const summary = [
      `${today.feeds} ${today.feeds === 1 ? "feed" : "feeds"}`,
      `${today.wet} wet ${today.wet === 1 ? "diaper" : "diapers"}`,
      `${today.dirty} dirty ${today.dirty === 1 ? "diaper" : "diapers"}`,
      `${formatDuration(today.sleepMinutes)} recorded sleep`
    ];
    if (today.baths) summary.push(`${today.baths} ${today.baths === 1 ? "bath" : "baths"}`);
    if (today.sunbathing) summary.push(`${today.sunbathing} sunbathing ${today.sunbathing === 1 ? "session" : "sessions"}`);
    if (today.walks) summary.push(`${today.walks} ${today.walks === 1 ? "walk" : "walks"}`);
    $("#daily-report-copy").textContent = `${summary.join(" · ")}.`;
    const localSuggestion = `Cam logged ${today.feeds} feeds, ${today.diapers} diaper changes, and ${formatDuration(today.sleepMinutes)} of sleep in this care day; compared with the previous day, feeds were ${today.feeds === previous.feeds ? "steady" : today.feeds > previous.feeds ? "higher" : "lower"}. Use the age-based pattern as a gentle guide, remembering that missing entries and direct breastfeeding can make totals look lower.`;
    $("#daily-tip").textContent = dailyInsight?.suggestion || localSuggestion;
    $("#daily-tip-meta").textContent = dailyInsight
      ? `${dailyInsight.provider === "openai" ? "GPT suggestion" : "Age-based backup"} · ${dailyInsight.reportDate} · generated once`
      : "Preparing the latest completed 8 PM report";

    const week = weeklyDisplayWindow();
    const weekly = totalsFor(eventsForWindow(week.start, week.end));
    const weeklySummary = [
      `${weekly.feeds} ${weekly.feeds === 1 ? "feed" : "feeds"}`,
      `${weekly.wet} wet ${weekly.wet === 1 ? "diaper" : "diapers"}`,
      `${weekly.dirty} dirty ${weekly.dirty === 1 ? "diaper" : "diapers"}`,
      `${formatDuration(weekly.sleepMinutes)} recorded sleep`
    ];
    if (weekly.baths) weeklySummary.push(`${weekly.baths} ${weekly.baths === 1 ? "bath" : "baths"}`);
    if (weekly.sunbathing) weeklySummary.push(`${weekly.sunbathing} sunbathing ${weekly.sunbathing === 1 ? "session" : "sessions"}`);
    if (weekly.walks) weeklySummary.push(`${weekly.walks} ${weekly.walks === 1 ? "walk" : "walks"}`);
    const shortDate = (date) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short" }).format(date);
    $("#weekly-window-label").textContent = `Baby week ${week.weekNumber} · ${shortDate(week.start)} → ${shortDate(week.end)}`;
    $("#weekly-report-copy").textContent = `${weeklySummary.join(" · ")}.`;
    const nextWeeklyAt = weeklyInsight?.nextAvailableAt ? new Date(weeklyInsight.nextAvailableAt) : babyWeekGenerationAt(week.weekNumber);
    const pendingSuggestion = `Cam’s first weekly suggestion will be generated at 8:00 PM when baby week ${week.weekNumber} is complete.`;
    $("#weekly-tip").textContent = weeklyInsight?.suggestion || (weeklyInsight?.status === "generating" ? "Preparing Cam’s completed baby-week comparison now." : pendingSuggestion);
    $("#weekly-tip-meta").textContent = weeklyInsight?.suggestion
      ? `${weeklyInsight.provider === "openai" ? "GPT suggestion" : "Age-based backup"} · generated once for baby week ${weeklyInsight.weekNumber}`
      : `${formatDateTime(nextWeeklyAt)} · based on Cam’s age week, not the calendar week`;
  }

  async function refreshDailyInsight() {
    if (!syncReady) return;
    try {
      const insight = await camRequest("/daily-insight");
      if (insight?.suggestion) dailyInsight = insight;
      renderReports();
      clearTimeout(dailyInsightTimer);
      if (insight?.status === "generating") {
        dailyInsightTimer = setTimeout(refreshDailyInsight, 10_000);
        return;
      }
      const nextAt = new Date(insight?.nextAvailableAt || 0).getTime();
      const delay = nextAt - Date.now();
      if (delay > 0 && delay < 2147483647) {
        dailyInsightTimer = setTimeout(refreshDailyInsight, delay + 2000);
      }
    } catch (_) {
      $("#daily-tip-meta").textContent = "Age-based backup · GPT service unavailable";
    }
  }

  async function refreshWeeklyInsight() {
    if (!syncReady) return;
    try {
      const insight = await camRequest("/weekly-insight");
      weeklyInsight = insight;
      renderReports();
      clearTimeout(weeklyInsightTimer);
      if (insight?.status === "generating") {
        weeklyInsightTimer = setTimeout(refreshWeeklyInsight, 10_000);
        return;
      }
      const nextAt = new Date(insight?.nextAvailableAt || 0).getTime();
      const delay = nextAt - Date.now();
      if (delay > 0 && delay < 2147483647) {
        weeklyInsightTimer = setTimeout(refreshWeeklyInsight, delay + 2000);
      }
    } catch (_) {
      $("#weekly-tip-meta").textContent = "Age-based backup · weekly service unavailable";
    }
  }

  function renderDate() {
    const label = new Intl.DateTimeFormat("en", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(now());
    ["#today-label", "#stats-date-label", "#pump-date-label", "#reports-date-label", "#profile-date-label", "#vaccine-date-label"].forEach((selector) => {
      const target = $(selector);
      if (target) target.textContent = label;
    });
  }

  function renderBabyDetails() {
    $("#baby-age-label").textContent = babyAgeLabel();
    $("#greeting-text").textContent = `How is ${BABY.shortName} doing?`;
    $("#profile-summary").textContent = `${BABY.sex} · Born 18 November 2026 at 8:00 AM · ${BABY.birthWeightKg} kg at birth`;
    $("#measurements-summary").textContent = `Birth weight · ${BABY.birthWeightKg} kg`;
    $("#birth-details-row").textContent = `18 Nov 2026 · 8:00 AM · ${BABY.sex} · ${BABY.birthWeightKg} kg`;
    $$('[data-user-avatar]').forEach((image) => {
      image.src = currentUser?.avatarUrl || "./house_cam.jpg";
    });
  }

  function vaccineDueStatus(dueAt) {
    const due = new Date(dueAt);
    const current = now();
    const dueDay = startOfDay(due);
    const currentDay = startOfDay(current);
    const daysAway = Math.round((dueDay - currentDay) / 86400000);
    if (due < current) return { label: `Overdue · ${formatDateTime(due)}`, className: "overdue" };
    if (daysAway === 0) return { label: `Due today · ${formatTime(due)}`, className: "" };
    if (daysAway === 1) return { label: `Due tomorrow · ${formatTime(due)}`, className: "" };
    if (daysAway <= 7) return { label: `Due in ${daysAway} days · ${formatDateTime(due)}`, className: "" };
    return { label: `Scheduled · ${formatDateTime(due)}`, className: "" };
  }

  function renderVaccine() {
    const records = state.events.filter((event) => event.type === "vaccine");
    const upcoming = records
      .filter((event) => event.data?.status !== "completed")
      .sort((a, b) => new Date(a.data?.dueAt || a.timestamp) - new Date(b.data?.dueAt || b.timestamp));
    const completed = records
      .filter((event) => event.data?.status === "completed")
      .sort((a, b) => new Date(b.data?.administeredAt || b.timestamp) - new Date(a.data?.administeredAt || a.timestamp));
    const next = upcoming[0];
    $("#vaccine-upcoming-count").textContent = String(upcoming.length);
    $("#vaccine-next-name").textContent = next?.data?.kind || next?.title || "No vaccine scheduled";
    $("#vaccine-next-time").textContent = next ? vaccineDueStatus(next.data?.dueAt || next.timestamp).label : "Add the clinic’s recommended date";
    $("#vaccine-upcoming-summary").textContent = upcoming.length ? `${upcoming.length} planned ${upcoming.length === 1 ? "dose" : "doses"}` : "No planned doses";
    $("#vaccine-completed-summary").textContent = completed.length ? `${completed.length} ${completed.length === 1 ? "shot" : "shots"} recorded` : "No shots recorded";

    $("#vaccine-upcoming-list").innerHTML = upcoming.length ? upcoming.map((event) => {
      const due = vaccineDueStatus(event.data?.dueAt || event.timestamp);
      return `<article class="vaccine-item"><button class="vaccine-item-main" data-vaccine-open="${escapeHtml(event.id)}" type="button"><span class="vaccine-item-icon">${icons.vaccine}</span><span class="vaccine-item-copy"><strong>${escapeHtml(event.data?.kind || event.title)}</strong><small>${escapeHtml(event.data?.note || "No note")}</small><span class="vaccine-status ${due.className}">${escapeHtml(due.label)}</span></span></button><button class="vaccine-done" data-vaccine-complete="${escapeHtml(event.id)}" type="button">Mark done</button></article>`;
    }).join("") : '<div class="vaccine-empty">No vaccines are scheduled yet. Add the date supplied by Cam’s clinic so it stays visible here.</div>';

    $("#vaccine-completed-list").innerHTML = completed.length ? completed.map((event) => {
      const administeredAt = event.data?.administeredAt || event.timestamp;
      return `<article class="vaccine-item completed"><button class="vaccine-item-main" data-vaccine-open="${escapeHtml(event.id)}" type="button"><span class="vaccine-item-icon">${icons.check}</span><span class="vaccine-item-copy"><strong>${escapeHtml(event.data?.kind || event.title)}</strong><small>Taken ${escapeHtml(formatDateTime(administeredAt))}</small><span class="vaccine-status completed">Completed</span></span></button><button class="vaccine-done" data-vaccine-open="${escapeHtml(event.id)}" type="button">View</button></article>`;
    }).join("") : '<div class="vaccine-empty">Completed shots will appear here with both their planned and actual times.</div>';
  }

  function renderSession() {
    const container = $("#active-sessions");
    const sessions = state.activeSessions || { sleep: null, feed: null, other: null };
    const cards = [];
    if (sessions.sleep) cards.push({ key: "sleep", session: sessions.sleep, label: "Sleep in progress", icon: icons.sleep });
    if (sessions.feed) {
      const feed = sessions.feed;
      const label = feed.mode === "bottle" ? `${feed.milk} bottle in progress` : `${feed.side || "Breast"} feed in progress`;
      cards.push({ key: "feed", session: feed, label, icon: icons.feed });
    }
    if (sessions.other) {
      const activity = sessions.other;
      cards.push({ key: "other", session: activity, label: `${activity.title} in progress`, icon: iconFor(activity.type) });
    }
    container.innerHTML = cards.map((item) => `<button class="active-session ${item.key === "feed" ? "feed-session" : ""}" data-stop-session="${item.key}" type="button"><span class="session-icon">${item.icon}</span><span><small>${item.label}</small><strong data-session-timer="${item.key}">00:00</strong></span><span class="stop-pill">Stop</span></button>`).join("");

    clearInterval(sessionTicker);
    sessionTicker = null;
    if (!cards.length) return;
    const update = () => {
      cards.forEach((item) => {
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(item.session.startedAt).getTime()) / 1000));
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, "0");
        const seconds = (elapsed % 60).toString().padStart(2, "0");
        const target = $(`[data-session-timer="${item.key}"]`);
        if (target) target.textContent = hours ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
      });
    };
    update();
    sessionTicker = setInterval(update, 1000);
  }

  function renderAll() {
    renderBabyDetails();
    renderDate();
    renderTimeline();
    renderLastFeed();
    renderStats();
    renderPump();
    renderReports();
    renderVaccine();
    renderSession();
  }

  function showToast() {}

  function commitActivities(events, message = "Activity logged", onCommit = null) {
    if (onCommit) onCommit();
    state.events.push(...events.filter(Boolean));
    saveState();
    renderAll();
    closeSheet();
    showToast(message, true);
  }

  function addActivity(event, message = "Activity logged") {
    commitActivities([event], message);
  }

  function addActivityWithWakeCheck(event, message, activityLabel, onCommit = null) {
    const sleepSession = state.activeSessions?.sleep;
    if (!sleepSession) {
      commitActivities([event], message, onCommit);
      return;
    }
    const sleepStartedAt = new Date(sleepSession.startedAt);
    const activityStart = event.data?.startAt
      ? new Date(event.data.startAt)
      : new Date(event.timestamp);
    const wakeTime = activityStart >= sleepStartedAt ? activityStart : now();
    openWakeConfirmation(activityLabel, { event, message, wakeTime, onCommit });
  }

  function openWakeConfirmation(activityLabel, pendingActivity = null) {
    const actionCopy = pendingActivity
      ? `The ${activityLabel} is ready to log. Tell LittleLog whether Cam woke up first.`
      : `The ${activityLabel} began while sleep is running. Tell LittleLog whether Cam woke up.`;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Sleep is still running</p><h2 id="sheet-title">Did ${BABY.shortName} wake up?</h2><p class="sheet-subtitle">${actionCopy}</p></header>
      <div class="wake-choice"><button class="sheet-primary" id="wake-yes" type="button">Yes, stop sleep</button><button class="sheet-secondary" id="wake-no" type="button">No, keep sleep running</button></div>
    `);
    $("#wake-yes").addEventListener("click", () => {
      const sleepEvent = createStoppedSleepEvent(pendingActivity?.wakeTime || now());
      if (pendingActivity) {
        commitActivities([sleepEvent, pendingActivity.event], pendingActivity.message, pendingActivity.onCommit);
        return;
      }
      if (sleepEvent) commitActivities([sleepEvent], `Sleep ended when the ${activityLabel} began`);
    });
    $("#wake-no").addEventListener("click", () => {
      if (pendingActivity) {
        commitActivities([pendingActivity.event], pendingActivity.message, pendingActivity.onCommit);
        return;
      }
      closeSheet();
      showToast(`${activityLabel[0].toUpperCase() + activityLabel.slice(1)} started · sleep continues`, false);
    });
  }

  function deleteActivity(eventId) {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) return;
    state.events = state.events.filter((item) => item.id !== eventId);
    state.deletedEventIds = [...new Set([...(state.deletedEventIds || []), eventId])];
    saveState();
    renderAll();
    closeSheet();
    showToast("Entry deleted", true);
  }

  function openSheet(html) {
    $("#sheet-content").innerHTML = html;
    $("#sheet-backdrop").classList.add("open");
    $("#action-sheet").classList.add("open");
  }

  function closeSheet() {
    $("#sheet-backdrop").classList.remove("open");
    $("#action-sheet").classList.remove("open");
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    $(".phone-screen").scrollTop = 0;
  }

  function bindWheel(prefix, initial, min, max, step, onChange) {
    let value = initial;
    const update = () => {
      const target = $(`#${prefix}-value`);
      if (target) target.textContent = `${value} min`;
      onChange(value);
    };
    $(`#${prefix}-minus`)?.addEventListener("click", () => { value = Math.max(min, value - step); update(); });
    $(`#${prefix}-plus`)?.addEventListener("click", () => { value = Math.min(max, value + step); update(); });
    update();
    return () => value;
  }

  function openLogTimeSheet(activityLabel, onConfirm, options = {}) {
    const minMinutesAgo = Math.max(1, Number(options.minMinutesAgo || 5));
    const maxMinutesAgo = Math.max(minMinutesAgo, Number(options.maxMinutesAgo || 360));
    const stepMinutes = Math.max(1, Number(options.stepMinutes || 5));
    const initialMinutesAgo = Math.min(maxMinutesAgo, Math.max(minMinutesAgo, Number(options.initialMinutesAgo || 15)));
    const rangeLabel = (minutes) => formatDuration(Math.max(1, Math.round(minutes)));
    const midpoint = Math.max(minMinutesAgo, Math.round((maxMinutesAgo / 2) / stepMinutes) * stepMinutes);
    const eyebrow = options.eyebrow || "Log time";
    const title = options.title || `When did ${activityLabel} happen?`;
    const subtitle = options.subtitle || "Choose right now or scroll back to the time it happened.";
    const confirmNowLabel = options.confirmNowLabel || `Log ${activityLabel} now`;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${eyebrow}</p><h2 id="sheet-title">${title}</h2><p class="sheet-subtitle">${subtitle}</p></header>
      <div class="sheet-tabs time-choice" role="group" aria-label="Choose log time">
        <button class="active" data-log-time="now" type="button">Right now</button>
        <button data-log-time="earlier" type="button">Earlier</button>
      </div>
      <div class="time-scroller-panel hidden" id="time-scroller-panel">
        <span class="time-scroller-value"><small>How long ago?</small><strong id="time-scroller-value">${initialMinutesAgo} min ago</strong></span>
        <span class="time-scroller-control">
          <button id="time-scroller-minus" type="button" aria-label="Move 5 minutes closer to now">−</button>
          <input class="time-scroller" id="time-scroller" type="range" min="${minMinutesAgo}" max="${maxMinutesAgo}" step="${stepMinutes}" value="${initialMinutesAgo}" aria-label="Minutes before now" />
          <button id="time-scroller-plus" type="button" aria-label="Move 5 minutes earlier">+</button>
        </span>
        <span class="time-scroller-labels"><span>${rangeLabel(minMinutesAgo)}</span><span>${rangeLabel(midpoint)}</span><span>${rangeLabel(maxMinutesAgo)}</span></span>
      </div>
      <div class="sheet-actions"><button class="sheet-primary" id="confirm-log-time" type="button">${confirmNowLabel}</button></div>
    `);

    let mode = "now";
    let minutesAgo = initialMinutesAgo;
    const slider = $("#time-scroller");
    const selectedTime = () => new Date(Date.now() - (mode === "earlier" ? minutesAgo : 0) * 60000);
    const renderTime = () => {
      const timestamp = selectedTime();
      $("#time-scroller-value").textContent = `${minutesAgo} min ago`;
      $("#confirm-log-time").textContent = mode === "now"
        ? confirmNowLabel
        : options.confirmEarlierLabel?.(timestamp) || `Log ${activityLabel} at ${formatTime(timestamp)}`;
    };

    $$('[data-log-time]').forEach((button) => button.addEventListener("click", () => {
      mode = button.dataset.logTime;
      $$('[data-log-time]').forEach((item) => item.classList.toggle("active", item === button));
      $("#time-scroller-panel").classList.toggle("hidden", mode !== "earlier");
      renderTime();
    }));
    slider.addEventListener("input", () => {
      minutesAgo = Number(slider.value);
      renderTime();
    });
    const adjustTime = (amount) => {
      minutesAgo = Math.max(minMinutesAgo, Math.min(maxMinutesAgo, minutesAgo + amount));
      slider.value = String(minutesAgo);
      renderTime();
    };
    $("#time-scroller-minus").addEventListener("click", () => adjustTime(-stepMinutes));
    $("#time-scroller-plus").addEventListener("click", () => adjustTime(stepMinutes));
    $("#confirm-log-time").addEventListener("click", () => onConfirm(selectedTime()));
    renderTime();
  }

  function openPumpSheet() {
    const minMinutesAgo = 5;
    const maxMinutesAgo = 360;
    const stepMinutes = 5;
    const initialMinutesAgo = 15;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Milk pumping</p><h2 id="sheet-title">Log a pump</h2><p class="sheet-subtitle">Set the total first, then fine-tune the split between left and right.</p></header>
      <span class="choice-label">Total pumped</span>
      <div class="wheel-picker pump-total-picker"><button id="pump-total-minus" type="button" aria-label="Reduce total pumped by 10 millilitres">−</button><span class="wheel-value"><small>less</small><strong id="pump-total-value">100 ml</strong><em>more</em></span><button id="pump-total-plus" type="button" aria-label="Increase total pumped by 10 millilitres">+</button></div>
      <span class="choice-label">Split by breast</span>
      <div class="pump-side-entry-grid">
        <div class="pump-side-field"><strong>Left breast</strong><div class="pump-side-wheel"><button id="pump-left-minus" type="button" aria-label="Move 5 millilitres from left to right">−</button><span id="pump-left-value">50 ml</span><button id="pump-left-plus" type="button" aria-label="Move 5 millilitres from right to left">+</button></div></div>
        <div class="pump-side-field"><strong>Right breast</strong><div class="pump-side-wheel"><button id="pump-right-minus" type="button" aria-label="Move 5 millilitres from right to left">−</button><span id="pump-right-value">50 ml</span><button id="pump-right-plus" type="button" aria-label="Move 5 millilitres from left to right">+</button></div></div>
      </div>
      <span class="choice-label">Pump duration</span>
      <div class="wheel-picker"><button id="pump-duration-minus" type="button" aria-label="Reduce pump duration">−</button><span class="wheel-value"><small>shorter</small><strong id="pump-duration-value">15 min</strong><em>longer</em></span><button id="pump-duration-plus" type="button" aria-label="Increase pump duration">+</button></div>
      <span class="choice-label">Optional note</span><input class="sheet-input" id="pump-note" maxlength="120" placeholder="Comfort, settings, or anything useful" />
      <div class="sheet-tabs time-choice" role="group" aria-label="Choose pump time"><button class="active" data-pump-time="now" type="button">Right now</button><button data-pump-time="earlier" type="button">Earlier</button></div>
      <div class="time-scroller-panel hidden" id="pump-time-panel">
        <span class="time-scroller-value"><small>How long ago?</small><strong id="pump-time-value">15 min ago</strong></span>
        <span class="time-scroller-control"><button id="pump-time-minus" type="button" aria-label="Move 5 minutes closer to now">−</button><input class="time-scroller" id="pump-time-scroller" type="range" min="${minMinutesAgo}" max="${maxMinutesAgo}" step="${stepMinutes}" value="${initialMinutesAgo}" aria-label="Minutes before now" /><button id="pump-time-plus" type="button" aria-label="Move 5 minutes earlier">+</button></span>
        <span class="time-scroller-labels"><span>5m</span><span>3h</span><span>6h</span></span>
      </div>
      <div class="sheet-actions"><button class="sheet-primary" id="save-pump" type="button">Log pump now</button></div>
    `);

    let durationMin = 15;
    let totalMl = 100;
    let leftMl = 50;
    let rightMl = 50;
    let mode = "now";
    let minutesAgo = initialMinutesAgo;
    bindWheel("pump-duration", 15, 5, 90, 5, (value) => { durationMin = value; });
    const slider = $("#pump-time-scroller");
    const renderAmounts = () => {
      $("#pump-total-value").textContent = `${totalMl} ml`;
      $("#pump-left-value").textContent = `${leftMl} ml`;
      $("#pump-right-value").textContent = `${rightMl} ml`;
    };
    const adjustTotal = (amount) => {
      const nextTotal = Math.max(10, Math.min(1000, totalMl + amount));
      const halfChange = (nextTotal - totalMl) / 2;
      totalMl = nextTotal;
      leftMl += halfChange;
      rightMl += halfChange;
      renderAmounts();
    };
    const adjustSide = (side, amount) => {
      if (side === "left") {
        leftMl = Math.max(0, Math.min(totalMl, leftMl + amount));
        rightMl = totalMl - leftMl;
      } else {
        rightMl = Math.max(0, Math.min(totalMl, rightMl + amount));
        leftMl = totalMl - rightMl;
      }
      renderAmounts();
    };
    $("#pump-total-minus").addEventListener("click", () => adjustTotal(-10));
    $("#pump-total-plus").addEventListener("click", () => adjustTotal(10));
    $("#pump-left-minus").addEventListener("click", () => adjustSide("left", -5));
    $("#pump-left-plus").addEventListener("click", () => adjustSide("left", 5));
    $("#pump-right-minus").addEventListener("click", () => adjustSide("right", -5));
    $("#pump-right-plus").addEventListener("click", () => adjustSide("right", 5));
    const selectedTime = () => new Date(Date.now() - (mode === "earlier" ? minutesAgo : 0) * 60000);
    const renderTime = () => {
      const timestamp = selectedTime();
      $("#pump-time-value").textContent = `${minutesAgo} min ago`;
      $("#save-pump").textContent = mode === "now" ? "Log pump now" : `Log pump at ${formatTime(timestamp)}`;
    };
    $$('[data-pump-time]').forEach((button) => button.addEventListener("click", () => {
      mode = button.dataset.pumpTime;
      $$('[data-pump-time]').forEach((item) => item.classList.toggle("active", item === button));
      $("#pump-time-panel").classList.toggle("hidden", mode !== "earlier");
      renderTime();
    }));
    slider.addEventListener("input", () => { minutesAgo = Number(slider.value); renderTime(); });
    const adjustTime = (amount) => {
      minutesAgo = Math.max(minMinutesAgo, Math.min(maxMinutesAgo, minutesAgo + amount));
      slider.value = String(minutesAgo);
      renderTime();
    };
    $("#pump-time-minus").addEventListener("click", () => adjustTime(-stepMinutes));
    $("#pump-time-plus").addEventListener("click", () => adjustTime(stepMinutes));
    $("#save-pump").addEventListener("click", () => {
      const endedAt = selectedTime();
      const startedAt = new Date(endedAt.getTime() - durationMin * 60000);
      const note = $("#pump-note").value.trim();
      addActivity(makeEvent("pump", "Milk pump", `Left ${leftMl} ml · Right ${rightMl} ml · ${durationMin} min`, endedAt, {
        leftMl,
        rightMl,
        totalMl,
        durationMin,
        note,
        startAt: startedAt.toISOString(),
        endAt: endedAt.toISOString()
      }), "Milk pump logged");
    });
    renderAmounts();
    renderTime();
  }

  function openFeedSheet(defaultTab = "bottle") {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Quick log</p><h2 id="sheet-title">Feed</h2><p class="sheet-subtitle">Bottle is the default. Log a completed feed or start a live timer.</p></header>
      <div class="sheet-tabs"><button class="${defaultTab === "bottle" ? "active" : ""}" data-feed-tab="bottle" type="button">Bottle</button><button class="${defaultTab === "breast" ? "active" : ""}" data-feed-tab="breast" type="button">Breastfeeding</button></div>
      <div class="sheet-panel ${defaultTab === "breast" ? "" : "hidden"}" data-feed-panel="breast">
        <span class="choice-label">Side</span>
        <div class="choice-grid three" data-choice-group="side"><button class="choice-button selected" data-value="Left" type="button">Left</button><button class="choice-button" data-value="Right" type="button">Right</button><button class="choice-button" data-value="Both" type="button">Both</button></div>
        <span class="choice-label">Feed duration</span>
        <div class="wheel-picker"><button id="breast-duration-minus" type="button" aria-label="Reduce breastfeeding duration">−</button><span class="wheel-value"><small>shorter</small><strong id="breast-duration-value">15 min</strong><em>longer</em></span><button id="breast-duration-plus" type="button" aria-label="Increase breastfeeding duration">+</button></div>
        <span class="choice-label">Optional note</span><input class="sheet-input" id="breast-note" maxlength="80" placeholder="Latch, comfort, or anything useful" />
        <div class="sheet-actions two"><button class="sheet-primary" id="quick-breast" type="button">Log 15 min feed</button><button class="sheet-secondary" id="start-breast" type="button">Start timer</button></div>
      </div>
      <div class="sheet-panel ${defaultTab === "bottle" ? "" : "hidden"}" data-feed-panel="bottle">
        <span class="choice-label">Milk type</span>
        <div class="choice-grid" data-choice-group="milk"><button class="choice-button selected" data-value="Expressed milk" type="button">Breast milk</button><button class="choice-button" data-value="Formula" type="button">Formula</button></div>
        <span class="choice-label">Amount</span>
        <div class="amount-control"><button id="amount-minus" type="button" aria-label="Reduce amount">−</button><span class="amount-display"><strong id="bottle-amount">90 ml</strong><small>Adjust by 10 ml</small></span><button id="amount-plus" type="button" aria-label="Increase amount">+</button></div>
        <span class="choice-label">Feed duration</span>
        <div class="wheel-picker"><button id="bottle-duration-minus" type="button" aria-label="Reduce bottle feed duration">−</button><span class="wheel-value"><small>shorter</small><strong id="bottle-duration-value">15 min</strong><em>longer</em></span><button id="bottle-duration-plus" type="button" aria-label="Increase bottle feed duration">+</button></div>
        <span class="choice-label">Optional note</span><input class="sheet-input" id="bottle-note" maxlength="80" placeholder="How did the feed go?" />
        <div class="sheet-actions two"><button class="sheet-primary" id="log-bottle" type="button">Log 15 min feed</button><button class="sheet-secondary" id="start-bottle" type="button">Start timer</button></div>
      </div>
    `);

    let amount = 90;
    let breastDuration = 15;
    let bottleDuration = 15;
    $$('[data-feed-tab]').forEach((button) => button.addEventListener("click", () => {
      $$('[data-feed-tab]').forEach((item) => item.classList.toggle("active", item === button));
      $$('[data-feed-panel]').forEach((panel) => panel.classList.toggle("hidden", panel.dataset.feedPanel !== button.dataset.feedTab));
    }));
    $$('[data-choice-group]').forEach((group) => {
      $$(".choice-button", group).forEach((button) => button.addEventListener("click", () => {
        $$(".choice-button", group).forEach((item) => item.classList.toggle("selected", item === button));
      }));
    });
    $("#amount-minus")?.addEventListener("click", () => { amount = Math.max(10, amount - 10); $("#bottle-amount").textContent = `${amount} ml`; });
    $("#amount-plus")?.addEventListener("click", () => { amount = Math.min(360, amount + 10); $("#bottle-amount").textContent = `${amount} ml`; });
    bindWheel("breast-duration", 15, 5, 90, 5, (value) => { breastDuration = value; $("#quick-breast").textContent = `Log ${value} min feed`; });
    bindWheel("bottle-duration", 15, 5, 90, 5, (value) => { bottleDuration = value; $("#log-bottle").textContent = `Log ${value} min feed`; });
    $("#quick-breast")?.addEventListener("click", () => {
      const side = $('[data-choice-group="side"] .selected').dataset.value;
      const note = $("#breast-note").value.trim();
      openLogTimeSheet("feed", (endedAt) => {
        const startedAt = new Date(endedAt.getTime() - breastDuration * 60000);
        addActivityWithWakeCheck(makeEvent("feed", "Breastfeed", `${side} · ${breastDuration} min${note ? ` · ${note}` : ""}`, endedAt, {
          mode: "breast",
          side,
          durationMin: breastDuration,
          note,
          startAt: startedAt.toISOString(),
          endAt: endedAt.toISOString()
        }), "Breastfeed logged", "feed");
      });
    });
    $("#start-breast")?.addEventListener("click", () => {
      const side = $('[data-choice-group="side"] .selected').dataset.value;
      if (state.activeSessions.feed) { closeSheet(); showToast("A feed timer is already running", false); return; }
      const sleepWasRunning = Boolean(state.activeSessions.sleep);
      state.activeSessions.feed = { mode: "breast", side, startedAt: now().toISOString() };
      saveState();
      renderSession();
      closeSheet();
      showToast(`${side} feed timer started`, false);
      if (sleepWasRunning) openWakeConfirmation("feed");
    });
    $("#log-bottle")?.addEventListener("click", () => {
      const milk = $('[data-choice-group="milk"] .selected').dataset.value;
      const note = $("#bottle-note").value.trim();
      openLogTimeSheet("feed", (endedAt) => {
        const startedAt = new Date(endedAt.getTime() - bottleDuration * 60000);
        addActivityWithWakeCheck(makeEvent("feed", "Bottle feed", `${milk} · ${amount} ml · ${bottleDuration} min${note ? ` · ${note}` : ""}`, endedAt, {
          mode: "bottle",
          milk,
          amount,
          durationMin: bottleDuration,
          note,
          startAt: startedAt.toISOString(),
          endAt: endedAt.toISOString()
        }), "Bottle feed logged", "feed");
      });
    });
    $("#start-bottle")?.addEventListener("click", () => {
      const milk = $('[data-choice-group="milk"] .selected').dataset.value;
      if (state.activeSessions.feed) { closeSheet(); showToast("A feed timer is already running", false); return; }
      const sleepWasRunning = Boolean(state.activeSessions.sleep);
      state.activeSessions.feed = { mode: "bottle", milk, amount, startedAt: now().toISOString() };
      saveState();
      renderSession();
      closeSheet();
      showToast(`${milk} bottle timer started`, false);
      if (sleepWasRunning) openWakeConfirmation("feed");
    });
  }

  function openDiaperSheet() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">One tap</p><h2 id="sheet-title">Diaper</h2><p class="sheet-subtitle">Choose the closest match. You can edit it later.</p></header>
      <div class="instant-options">
        <button class="instant-option" data-diaper="wet" type="button">${icons.drop}<span>Wet</span></button>
        <button class="instant-option" data-diaper="dirty" type="button">${icons.dirty}<span>Dirty</span></button>
      </div>
      <span class="choice-label">Optional note</span><input class="sheet-input" id="diaper-note" maxlength="80" placeholder="Color, consistency, or amount" />
    `);
    $$('[data-diaper]').forEach((button) => button.addEventListener("click", () => {
      const kind = button.dataset.diaper;
      const note = $("#diaper-note").value.trim();
      const titles = { wet: "Wet diaper", dirty: "Dirty diaper" };
      openLogTimeSheet("diaper", (loggedAt) => {
        addActivityWithWakeCheck(makeEvent("diaper", titles[kind], "Logged", loggedAt, { kind, note }), `${titles[kind]} logged`, "diaper");
      });
    }));
  }

  function openSleepSheet() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Rest time</p><h2 id="sheet-title">Sleep</h2><p class="sheet-subtitle">Backdate the start when you could not open the app right away.</p></header>
      <span class="choice-label">Baby fell asleep how many minutes ago?</span>
      <div class="wheel-picker"><button id="sleep-ago-minus" type="button" aria-label="Reduce minutes ago">−</button><span class="wheel-value"><small>more recent</small><strong id="sleep-ago-value">15 min</strong><em>earlier</em></span><button id="sleep-ago-plus" type="button" aria-label="Increase minutes ago">+</button></div>
      <div class="sheet-actions"><button class="sheet-primary" id="start-sleep-backdated" type="button">Start from 15 min ago</button><button class="sheet-secondary" id="start-sleep" type="button">Start timer now</button></div>
    `);
    let minutesAgo = 15;
    bindWheel("sleep-ago", 15, 5, 180, 5, (value) => { minutesAgo = value; $("#start-sleep-backdated").textContent = `Start from ${value} min ago`; });
    const startSleep = (backdateMinutes) => {
      if (state.activeSessions.sleep) { closeSheet(); showToast("Sleep timer is already running", false); return; }
      state.activeSessions.sleep = { startedAt: new Date(Date.now() - backdateMinutes * 60000).toISOString() };
      saveState();
      renderSession();
      closeSheet();
      showToast(backdateMinutes ? `Sleep started ${backdateMinutes} min ago` : "Sleep timer started", false);
    };
    $("#start-sleep-backdated").addEventListener("click", () => startSleep(minutesAgo));
    $("#start-sleep").addEventListener("click", () => startSleep(0));
  }

  function openBathSheet() {
    openLogTimeSheet("bath", (endedAt) => {
      const durationMin = 10;
      const startedAt = new Date(endedAt.getTime() - durationMin * 60000);
      addActivityWithWakeCheck(makeEvent("bath", "Bath", "10 min", endedAt, {
        durationMin,
        startAt: startedAt.toISOString(),
        endAt: endedAt.toISOString()
      }), "Bath logged", "bath");
    });
  }

  function openOtherActivitiesSheet() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Other activities</p><h2 id="sheet-title">What is Cam doing?</h2><p class="sheet-subtitle">Choose an activity, then start a timer or log when it happened.</p></header>
      <div class="instant-options three">
        <button class="instant-option" data-other="bath" type="button">${icons.bath}<span>Bath</span></button>
        <button class="instant-option" data-other="sunbathing" type="button">${icons.sunbathing}<span>Sunbathing</span></button>
        <button class="instant-option" data-other="walk" type="button">${icons.walk}<span>Take a walk</span></button>
      </div>
    `);
    $$('[data-other]').forEach((button) => button.addEventListener("click", () => openOtherActivitySheet(button.dataset.other)));
  }

  function openOtherActivitySheet(activityKey) {
    const activity = OTHER_ACTIVITIES[activityKey];
    if (!activity) return;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Other activity</p><h2 id="sheet-title">${activity.title}</h2><p class="sheet-subtitle">Log a completed activity or start timing it now.</p></header>
      <span class="choice-label">Duration</span>
      <div class="wheel-picker"><button id="other-duration-minus" type="button" aria-label="Reduce activity duration">−</button><span class="wheel-value"><small>shorter</small><strong id="other-duration-value">${activity.defaultDuration} min</strong><em>longer</em></span><button id="other-duration-plus" type="button" aria-label="Increase activity duration">+</button></div>
      <span class="choice-label">Optional note</span><input class="sheet-input" id="other-activity-note" maxlength="100" placeholder="Anything useful to remember" />
      <div class="sheet-actions two"><button class="sheet-primary" id="log-other-activity" type="button">Log ${activity.title.toLowerCase()}</button><button class="sheet-secondary" id="start-other-activity" type="button">Start timer</button></div>
    `);
    let durationMin = activity.defaultDuration;
    bindWheel("other-duration", activity.defaultDuration, 5, 180, 5, (value) => { durationMin = value; });
    $("#log-other-activity").addEventListener("click", () => {
      const note = $("#other-activity-note").value.trim();
      openLogTimeSheet(activity.title.toLowerCase(), (endedAt) => {
        const startedAt = new Date(endedAt.getTime() - durationMin * 60000);
        addActivityWithWakeCheck(makeEvent(activity.type, activity.title, `${durationMin} min${note ? ` · ${note}` : ""}`, endedAt, { durationMin, note, startAt: startedAt.toISOString(), endAt: endedAt.toISOString() }), `${activity.title} logged`, activity.title.toLowerCase());
      }, { confirmNowLabel: `Log ${activity.title.toLowerCase()} now` });
    });
    $("#start-other-activity").addEventListener("click", () => {
      if (state.activeSessions?.other) { closeSheet(); return; }
      const sleepWasRunning = Boolean(state.activeSessions?.sleep);
      state.activeSessions.other = { activityKey, type: activity.type, title: activity.title, note: $("#other-activity-note").value.trim(), startedAt: now().toISOString() };
      saveState();
      renderSession();
      closeSheet();
      if (sleepWasRunning) openWakeConfirmation(activity.title.toLowerCase());
    });
  }

  function openOtherStopSheet() {
    const session = state.activeSessions?.other;
    if (!session) return;
    const elapsedMinutes = Math.max(1, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000));
    openLogTimeSheet(session.title.toLowerCase(), (endedAt) => stopOtherSession(endedAt), {
      eyebrow: "Finish activity",
      title: `When did ${session.title.toLowerCase()} finish?`,
      subtitle: "Stop right now or scroll back to the actual finish time.",
      confirmNowLabel: "Stop timer now",
      confirmEarlierLabel: (timestamp) => `Stop at ${formatTime(timestamp)}`,
      minMinutesAgo: 1,
      maxMinutesAgo: Math.min(360, elapsedMinutes),
      initialMinutesAgo: Math.min(10, elapsedMinutes),
      stepMinutes: elapsedMinutes < 5 ? 1 : 5
    });
  }

  function stopOtherSession(requestedEndedAt = now()) {
    const session = state.activeSessions?.other;
    if (!session) return;
    const startedAt = new Date(session.startedAt);
    const requested = new Date(requestedEndedAt);
    const endedAt = new Date(Math.min(Date.now(), Math.max(startedAt.getTime(), requested.getTime())));
    const durationMin = Math.max(1, Math.round((endedAt - startedAt) / 60000));
    addActivityWithWakeCheck(
      makeEvent(session.type, session.title, `${durationMin} min${session.note ? ` · ${session.note}` : ""}`, endedAt, { durationMin, note: session.note || "", startAt: startedAt.toISOString(), endAt: endedAt.toISOString() }),
      `${session.title} timer stopped`,
      session.title.toLowerCase(),
      () => { state.activeSessions.other = null; }
    );
  }

  function openNoteSheet() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Remember it later</p><h2 id="sheet-title">Add a note</h2><p class="sheet-subtitle">For medicine, temperature, symptoms, or anything else.</p></header>
      <span class="choice-label">Category</span>
      <select class="sheet-select" id="note-category"><option>General</option><option>Medicine</option><option>Temperature</option><option>Mood</option><option>Appointment</option></select>
      <span class="choice-label">Note</span><textarea class="sheet-textarea" id="note-copy" maxlength="180" placeholder="What would you like to remember?"></textarea>
      <div class="sheet-actions"><button class="sheet-primary" id="save-note" type="button">Save note</button></div>
    `);
    $("#save-note").addEventListener("click", () => {
      const category = $("#note-category").value;
      const copy = $("#note-copy").value.trim();
      if (!copy) {
        $("#note-copy").focus();
        return;
      }
      addActivity(makeEvent("note", category, copy, now(), { category, note: copy }), "Note saved");
    });
  }

  function openSleepStopSheet() {
    const session = state.activeSessions?.sleep;
    if (!session) return;
    const elapsedMinutes = Math.max(1, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000));
    openLogTimeSheet("sleep", (endedAt) => stopSleepSession("Sleep timer stopped", endedAt), {
      eyebrow: "Wake time",
      title: `When did ${BABY.shortName} wake up?`,
      subtitle: "Stop the sleep timer right now or scroll back to the actual wake-up time.",
      previewLabel: "Sleep will end",
      confirmNowLabel: "Stop sleep now",
      confirmEarlierLabel: (timestamp) => `Stop sleep at ${formatTime(timestamp)}`,
      minMinutesAgo: 1,
      maxMinutesAgo: Math.min(1440, elapsedMinutes),
      initialMinutesAgo: Math.min(15, elapsedMinutes),
      stepMinutes: elapsedMinutes < 5 ? 1 : 5
    });
  }

  function createStoppedSleepEvent(requestedEndedAt = now()) {
    const session = state.activeSessions?.sleep;
    if (!session) return null;
    const startedAt = new Date(session.startedAt);
    const requestedTime = new Date(requestedEndedAt);
    const currentTime = now();
    const endedAt = new Date(Math.min(
      currentTime.getTime(),
      Math.max(startedAt.getTime(), Number.isNaN(requestedTime.getTime()) ? currentTime.getTime() : requestedTime.getTime())
    ));
    const exactMinutes = Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 60000);
    const durationMin = Math.max(1, Math.round(exactMinutes));
    state.activeSessions.sleep = null;
    return makeEvent("sleep", "Sleep", exactMinutes < 1 ? "Less than 1 min" : formatDuration(durationMin), endedAt, {
      durationMin,
      startAt: session.startedAt,
      endAt: endedAt.toISOString()
    });
  }

  function stopSleepSession(message = "Sleep timer stopped", requestedEndedAt = now()) {
    const event = createStoppedSleepEvent(requestedEndedAt);
    if (event) commitActivities([event], message);
  }

  function stopFeedSession() {
    const session = state.activeSessions?.feed;
    if (!session) return;
    const endedAt = now();
    const exactMinutes = Math.max(0, (endedAt.getTime() - new Date(session.startedAt).getTime()) / 60000);
    const durationMin = Math.max(1, Math.round(exactMinutes));
    const durationText = exactMinutes < 1 ? "less than 1 min" : formatDuration(durationMin);
    state.activeSessions.feed = null;
    if (session.mode === "bottle") {
      addActivity(makeEvent("feed", "Bottle feed", `${session.milk} · ${session.amount} ml · ${durationText}`, endedAt, {
        mode: "bottle",
        milk: session.milk,
        amount: session.amount,
        durationMin,
        startAt: session.startedAt,
        endAt: endedAt.toISOString()
      }), "Bottle timer stopped");
    } else {
      addActivity(makeEvent("feed", "Breastfeed", `${session.side} · ${durationText}`, endedAt, {
        mode: "breast",
        side: session.side,
        durationMin,
        startAt: session.startedAt,
        endAt: endedAt.toISOString()
      }), "Feed timer stopped");
    }
  }

  function openEditActivitySheet(eventId) {
    const event = state.events.find((item) => item.id === eventId && item.type !== "vaccine");
    if (!event) return;
    const timed = ["feed", "sleep", "bath", "sunbathing", "walk", "pump"].includes(event.type);
    const durationMin = Math.max(1, Number(event.data?.durationMin || 10));
    const note = event.data?.note || "";
    const bottleFields = event.type === "feed" && event.data?.mode === "bottle" ? `
      <label class="choice-label" for="edit-feed-milk">Milk</label><select class="sheet-select" id="edit-feed-milk"><option value="Expressed milk" ${event.data?.milk === "Expressed milk" ? "selected" : ""}>Breast milk</option><option value="Formula" ${event.data?.milk === "Formula" ? "selected" : ""}>Formula</option></select>
      <label class="choice-label" for="edit-feed-amount">Amount (ml)</label><input class="sheet-input" id="edit-feed-amount" type="number" min="10" max="500" step="10" value="${Number(event.data?.amount || 90)}" />` : "";
    const breastFields = event.type === "feed" && event.data?.mode === "breast" ? `
      <label class="choice-label" for="edit-feed-side">Side</label><select class="sheet-select" id="edit-feed-side"><option ${event.data?.side === "Left" ? "selected" : ""}>Left</option><option ${event.data?.side === "Right" ? "selected" : ""}>Right</option><option ${event.data?.side === "Both" ? "selected" : ""}>Both</option></select>` : "";
    const pumpFields = event.type === "pump" ? `
      <span class="choice-label">Milk pumped</span><div class="pump-side-entry-grid"><label class="pump-side-field" for="edit-pump-left"><strong>Left breast</strong><input class="sheet-input" id="edit-pump-left" type="number" min="0" max="500" step="5" value="${Number(event.data?.leftMl || 0)}" /></label><label class="pump-side-field" for="edit-pump-right"><strong>Right breast</strong><input class="sheet-input" id="edit-pump-right" type="number" min="0" max="500" step="5" value="${Number(event.data?.rightMl || 0)}" /></label></div>` : "";
    const diaperFields = event.type === "diaper" ? `
      <label class="choice-label" for="edit-diaper-kind">Diaper</label><select class="sheet-select" id="edit-diaper-kind"><option value="wet" ${event.data?.kind === "wet" ? "selected" : ""}>Wet</option><option value="dirty" ${event.data?.kind === "dirty" ? "selected" : ""}>Dirty</option></select>` : "";
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Correct activity</p><h2 id="sheet-title">Edit ${escapeHtml(event.title)}</h2><p class="sheet-subtitle">Changes sync to the family record after you save.</p></header>
      ${bottleFields}${breastFields}${pumpFields}${diaperFields}
      <label class="choice-label" for="edit-activity-time">${timed ? "Finish time" : "Recorded time"}</label><input class="sheet-input" id="edit-activity-time" type="datetime-local" value="${toLocalDateTimeValue(event.timestamp)}" />
      ${timed ? `<label class="choice-label" for="edit-activity-duration">Duration (minutes)</label><input class="sheet-input" id="edit-activity-duration" type="number" min="1" max="1440" step="1" value="${durationMin}" />` : ""}
      <label class="choice-label" for="edit-activity-note">Optional note</label><textarea class="sheet-textarea" id="edit-activity-note" maxlength="180" placeholder="Anything useful to remember">${escapeHtml(note)}</textarea>
      <div class="sheet-actions"><button class="sheet-primary" id="save-activity-edit" type="button">Save changes</button></div>
    `);
    $("#save-activity-edit").addEventListener("click", () => {
      const endedAt = new Date($("#edit-activity-time").value);
      if (Number.isNaN(endedAt.getTime())) { $("#edit-activity-time").focus(); return; }
      const editedPumpLeft = event.type === "pump" ? Math.max(0, Math.min(500, Number($("#edit-pump-left").value || 0))) : 0;
      const editedPumpRight = event.type === "pump" ? Math.max(0, Math.min(500, Number($("#edit-pump-right").value || 0))) : 0;
      if (event.type === "pump" && !editedPumpLeft && !editedPumpRight) { $("#edit-pump-left").focus(); return; }
      const updatedDuration = timed ? Math.max(1, Number($("#edit-activity-duration").value || durationMin)) : 0;
      const updatedNote = $("#edit-activity-note").value.trim();
      event.timestamp = endedAt.toISOString();
      if (timed) {
        const startedAt = new Date(endedAt.getTime() - updatedDuration * 60000);
        event.data = { ...event.data, durationMin: updatedDuration, note: updatedNote, startAt: startedAt.toISOString(), endAt: endedAt.toISOString() };
      } else event.data = { ...event.data, note: updatedNote };
      if (event.type === "pump") {
        event.data.leftMl = editedPumpLeft;
        event.data.rightMl = editedPumpRight;
        event.data.totalMl = event.data.leftMl + event.data.rightMl;
        event.title = "Milk pump";
        event.detail = `Left ${event.data.leftMl} ml · Right ${event.data.rightMl} ml · ${updatedDuration} min`;
      } else if (event.type === "feed" && event.data.mode === "bottle") {
        event.data.milk = $("#edit-feed-milk").value;
        event.data.amount = Math.max(10, Number($("#edit-feed-amount").value || 10));
        event.title = "Bottle feed";
        event.detail = `${event.data.milk} · ${event.data.amount} ml · ${updatedDuration} min${updatedNote ? ` · ${updatedNote}` : ""}`;
      } else if (event.type === "feed") {
        event.data.side = $("#edit-feed-side").value;
        event.title = "Breastfeed";
        event.detail = `${event.data.side} · ${updatedDuration} min${updatedNote ? ` · ${updatedNote}` : ""}`;
      } else if (event.type === "diaper") {
        event.data.kind = $("#edit-diaper-kind").value;
        event.title = event.data.kind === "wet" ? "Wet diaper" : "Dirty diaper";
        event.detail = "Logged";
      } else if (timed) {
        event.detail = `${updatedDuration} min${updatedNote ? ` · ${updatedNote}` : ""}`;
      } else if (updatedNote) event.detail = updatedNote;
      saveState();
      renderAll();
      closeSheet();
    });
  }

  function openActivityPattern() {
    const events = eventsForCareDay().filter((event) => {
      const date = new Date(event.timestamp);
      const hour = date.getHours() + date.getMinutes() / 60;
      return hour >= 8 && hour <= 20;
    });
    const lanes = [
      { label: "Feeds", types: ["feed"], className: "feed" },
      { label: "Diapers", types: ["diaper"], className: "diaper" },
      { label: "Sleep", types: ["sleep"], className: "sleep" },
      { label: "Other", types: ["bath", "sunbathing", "walk"], className: "other" }
    ];
    const laneMarkup = lanes.map((lane) => {
      const points = events.filter((event) => lane.types.includes(event.type)).map((event) => {
        const date = new Date(event.timestamp);
        const hour = date.getHours() + date.getMinutes() / 60;
        const left = Math.max(0, Math.min(100, ((hour - 8) / 12) * 100));
        return `<i class="pattern-point ${lane.className}" style="left:${left}%" title="${escapeHtml(event.title)} · ${escapeHtml(formatTime(date))}"></i>`;
      }).join("");
      return `<div class="pattern-lane"><strong>${lane.label}</strong><span class="pattern-track">${points}</span></div>`;
    }).join("");
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Current care day</p><h2 id="sheet-title">Activities pattern</h2><p class="sheet-subtitle">A daytime view from 8:00 AM to 8:00 PM. Each dot marks when an activity was recorded or finished.</p></header>
      <div class="activity-pattern"><div class="pattern-axis"><span>8 AM</span><span>12 PM</span><span>4 PM</span><span>8 PM</span></div>${laneMarkup}${events.length ? "" : '<div class="pattern-empty">No daytime activities have been logged in this care day.</div>'}</div>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openEventSheet(eventId) {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) return;
    const timeRange = timeRangeFor(event);
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${formatTime(event.timestamp)}</p><h2 id="sheet-title">${event.title}</h2><p class="sheet-subtitle">${event.detail || "No extra details"}</p></header>
      <div class="mini-report">
        <div class="mini-report-row"><span>Recorded</span><strong>${new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(event.timestamp))}</strong></div>
        ${timeRange ? `<div class="mini-report-row"><span>From–to</span><strong>${timeRange}</strong></div>` : ""}
        <div class="mini-report-row"><span>Category</span><strong>${event.type[0].toUpperCase() + event.type.slice(1)}</strong></div>
      </div>
      <div class="sheet-actions"><button class="sheet-danger" id="delete-entry" type="button">Delete entry</button></div>
    `);
    $("#delete-entry").addEventListener("click", () => deleteActivity(event.id));
  }

  function openRangeInfo() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Designed for reassurance</p><h2 id="sheet-title">How comparisons work</h2></header>
      <p class="info-copy"><strong>Broad ranges, not scores.</strong> Today’s tracks show ${BABY.shortName}’s recorded position against the broad reference range for her current age in days.</p>
      <p class="info-copy">The 7- and 30-care-day views plot each logged day as a line. The pastel-green area changes with Cam’s age, and days without that activity are left unplotted instead of being treated as zero.</p>
      <p class="info-copy"><strong>${BABY.gestationalAgeWeeks} weeks · ${BABY.ethnicity} · ${BABY.sex.toLowerCase()}.</strong> This signal reference uses Cam’s full-term history and her feeding pattern: ${BABY.feedingProfile.toLowerCase()}. Sex and ethnicity are not used as unsupported corrections to feed, diaper, or sleep ranges.</p>
      <p class="info-copy">Bottle volume is measurable for Cam’s expressed breast milk and formula feeds. Because her current weight has not been measured, the volume reference remains deliberately broad and does not claim to be a weight-based target.</p>
      <p class="info-copy">Important warning signs should use separately reviewed rules and should never wait for the evening report.</p>
      <span class="feedback-pill">Educational guidance only</span>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Got it</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openNotificationPreview() {
    const totals = totalsFor(dailyReportEvents());
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Notification preview</p><h2 id="sheet-title">${BABY.shortName}’s day at a glance</h2><p class="sheet-subtitle">LittleLog · today at 8:00 PM · covers the previous 24 hours</p></header>
      <div class="report-tip" style="margin-top:16px"><strong>Today</strong><p>${totals.feeds} feeds · ${totals.wet} wet diapers · ${totals.dirty} dirty diapers · ${formatDuration(totals.sleepMinutes)} recorded sleep.</p></div>
      <p class="info-copy">${dailyInsight?.suggestion || "The latest completed care-day suggestion will appear here after it is prepared."}</p>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openProfileInfo(kind = "profile") {
    const content = kind === "measurements"
      ? { eyebrow: "Growth", title: "Measurements", copy: `${BABY.shortName} weighed ${BABY.birthWeightKg} kg at birth. Future weight, length, and head-circumference measurements can be added here.` }
      : kind === "age"
        ? { eyebrow: "Birth details", title: BABY.fullName, copy: `${BABY.shortName} is a girl, born at 8:00 AM on 18 November 2026, weighing ${BABY.birthWeightKg} kg. Her current age is ${babyAgeLabel()}.` }
        : { eyebrow: "Baby profile", title: BABY.fullName, copy: `${BABY.shortName} · Girl · Born 18 November 2026 at 8:00 AM · ${BABY.birthWeightKg} kg at birth.` };
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${content.eyebrow}</p><h2 id="sheet-title">${content.title}</h2></header>
      <p class="info-copy">${content.copy}</p>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openVaccineForm(mode = "schedule", event = null) {
    const isEdit = Boolean(event);
    const isCompleted = mode === "record" || event?.data?.status === "completed";
    const defaultPlanned = new Date();
    defaultPlanned.setDate(defaultPlanned.getDate() + (mode === "schedule" ? 1 : 0));
    defaultPlanned.setHours(mode === "schedule" ? 9 : defaultPlanned.getHours(), mode === "schedule" ? 0 : defaultPlanned.getMinutes(), 0, 0);
    const kind = event?.data?.kind || "";
    const plannedAt = event?.data?.dueAt || event?.timestamp || defaultPlanned;
    const administeredAt = event?.data?.administeredAt || (mode === "record" ? now() : plannedAt);
    const note = event?.data?.note || "";
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${isCompleted ? "Shot record" : "Vaccine plan"}</p><h2 id="sheet-title">${isEdit ? "Edit vaccine" : isCompleted ? "Record a vaccine" : "Schedule a vaccine"}</h2><p class="sheet-subtitle">Use the vaccine name and planned date supplied by Cam’s clinic.</p></header>
      <label class="choice-label" for="vaccine-kind-input">Vaccine</label>
      <input class="sheet-input" id="vaccine-kind-input" list="vaccine-kind-options" maxlength="100" value="${escapeHtml(kind)}" placeholder="Start typing a vaccine name" />
      <datalist id="vaccine-kind-options"><option value="Hepatitis B"></option><option value="BCG"></option><option value="DTaP / IPV / Hib"></option><option value="Pneumococcal (PCV)"></option><option value="Rotavirus"></option><option value="Influenza"></option><option value="MMR"></option></datalist>
      <label class="choice-label" for="vaccine-planned-at">Planned date and time</label>
      <input class="sheet-input" id="vaccine-planned-at" type="datetime-local" value="${toLocalDateTimeValue(plannedAt)}" />
      ${isCompleted ? `<label class="choice-label" for="vaccine-administered-at">Actual shot date and time</label><input class="sheet-input" id="vaccine-administered-at" type="datetime-local" value="${toLocalDateTimeValue(administeredAt)}" />` : ""}
      <label class="choice-label" for="vaccine-note">Note</label>
      <textarea class="sheet-textarea" id="vaccine-note" maxlength="240" placeholder="Clinic, dose, reaction, or anything useful">${escapeHtml(note)}</textarea>
      <div class="sheet-actions"><button class="sheet-primary" id="save-vaccine" type="button">${isEdit ? "Save changes" : isCompleted ? "Save completed shot" : "Add to schedule"}</button></div>
    `);
    $("#save-vaccine").addEventListener("click", () => {
      const vaccineKind = $("#vaccine-kind-input").value.trim();
      const dueAt = new Date($("#vaccine-planned-at").value);
      const actualInput = $("#vaccine-administered-at");
      const actualAt = actualInput ? new Date(actualInput.value) : null;
      const vaccineNote = $("#vaccine-note").value.trim();
      if (!vaccineKind) { $("#vaccine-kind-input").focus(); return; }
      if (Number.isNaN(dueAt.getTime())) { $("#vaccine-planned-at").focus(); return; }
      if (isCompleted && (!actualAt || Number.isNaN(actualAt.getTime()))) { actualInput.focus(); return; }
      const timestamp = isCompleted ? actualAt : dueAt;
      const data = {
        kind: vaccineKind,
        status: isCompleted ? "completed" : "scheduled",
        dueAt: dueAt.toISOString(),
        administeredAt: isCompleted ? actualAt.toISOString() : null,
        note: vaccineNote
      };
      if (event) {
        event.title = vaccineKind;
        event.detail = isCompleted ? "Completed" : "Scheduled";
        event.timestamp = timestamp.toISOString();
        event.data = data;
        saveState();
        renderAll();
        closeSheet();
      } else {
        addActivity(makeEvent("vaccine", vaccineKind, isCompleted ? "Completed" : "Scheduled", timestamp, data), isCompleted ? "Vaccine recorded" : "Vaccine scheduled");
      }
    });
  }

  function openCompleteVaccineSheet(eventId) {
    const event = state.events.find((item) => item.id === eventId && item.type === "vaccine");
    if (!event) return;
    const dueAt = event.data?.dueAt || event.timestamp;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Mark as done</p><h2 id="sheet-title">${escapeHtml(event.data?.kind || event.title)}</h2><p class="sheet-subtitle">Planned for ${escapeHtml(formatDateTime(dueAt))}. Save when the shot was actually given.</p></header>
      <label class="choice-label" for="completed-vaccine-time">Actual shot date and time</label><input class="sheet-input" id="completed-vaccine-time" type="datetime-local" value="${toLocalDateTimeValue(dueAt)}" />
      <label class="choice-label" for="completed-vaccine-note">Note</label><textarea class="sheet-textarea" id="completed-vaccine-note" maxlength="240" placeholder="Clinic, dose, reaction, or anything useful">${escapeHtml(event.data?.note || "")}</textarea>
      <div class="sheet-actions"><button class="sheet-primary" id="confirm-vaccine-complete" type="button">Mark vaccine done</button></div>
    `);
    $("#confirm-vaccine-complete").addEventListener("click", () => {
      const administeredAt = new Date($("#completed-vaccine-time").value);
      if (Number.isNaN(administeredAt.getTime())) { $("#completed-vaccine-time").focus(); return; }
      event.timestamp = administeredAt.toISOString();
      event.detail = "Completed";
      event.data = { ...event.data, status: "completed", dueAt: new Date(dueAt).toISOString(), administeredAt: administeredAt.toISOString(), note: $("#completed-vaccine-note").value.trim() };
      saveState();
      renderAll();
      closeSheet();
    });
  }

  function openVaccineDetails(eventId) {
    const event = state.events.find((item) => item.id === eventId && item.type === "vaccine");
    if (!event) return;
    const completed = event.data?.status === "completed";
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${completed ? "Completed shot" : "Scheduled dose"}</p><h2 id="sheet-title">${escapeHtml(event.data?.kind || event.title)}</h2><p class="sheet-subtitle">${escapeHtml(event.data?.note || "No note added")}</p></header>
      <div class="vaccine-detail-grid"><div><span>Planned</span><strong>${escapeHtml(formatDateTime(event.data?.dueAt || event.timestamp))}</strong></div>${completed ? `<div><span>Actually taken</span><strong>${escapeHtml(formatDateTime(event.data?.administeredAt || event.timestamp))}</strong></div>` : ""}<div><span>Status</span><strong>${completed ? "Completed" : vaccineDueStatus(event.data?.dueAt || event.timestamp).label}</strong></div></div>
      <div class="sheet-actions two"><button class="sheet-secondary" id="edit-vaccine-record" type="button">Edit</button>${completed ? '<button class="sheet-primary" data-close-sheet type="button">Done</button>' : '<button class="sheet-primary" id="complete-vaccine-record" type="button">Mark done</button>'}</div>
      <div class="sheet-actions"><button class="sheet-danger" id="delete-vaccine-record" type="button">Delete vaccine record</button></div>
    `);
    $('[data-close-sheet]')?.addEventListener("click", closeSheet);
    $("#edit-vaccine-record").addEventListener("click", () => openVaccineForm("edit", event));
    $("#complete-vaccine-record")?.addEventListener("click", () => openCompleteVaccineSheet(event.id));
    $("#delete-vaccine-record").addEventListener("click", () => deleteActivity(event.id));
  }

  function openSettings() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Settings</p><h2 id="sheet-title">Preferences</h2><p class="sheet-subtitle">Care records and preferences sync securely across approved devices.</p></header>
      <div class="mini-report">
        <div class="mini-report-row"><span>Time zone</span><strong>Asia/Saigon</strong></div>
        <div class="mini-report-row"><span>Units</span><strong>Metric</strong></div>
        <div class="mini-report-row"><span>Daily report</span><strong>8:00 PM</strong></div>
        <div class="mini-report-row"><span>Weekly report</span><strong>Cam’s age week · 8:00 PM</strong></div>
        <div class="mini-report-row"><span>Storage</span><strong>Railway PostgreSQL</strong></div>
      </div>
      <div class="sheet-actions two"><button class="sheet-secondary" id="sign-out-littlelog" type="button">Sign out</button><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
    $("#sign-out-littlelog").addEventListener("click", signOutLittleLog);
  }

  function clearHistory() {
    const careEvents = state.events.filter((event) => event.type !== "vaccine");
    state.deletedEventIds = [...new Set([...(state.deletedEventIds || []), ...careEvents.map((event) => event.id)])];
    state.events = state.events.filter((event) => event.type === "vaccine");
    saveState();
    renderAll();
    closeSheet();
  }

  async function signOutLittleLog() {
    try {
      await camRequest("/session", { method: "DELETE" });
    } finally {
      if (activeStorageKey) localStorage.removeItem(activeStorageKey);
      window.location.reload();
    }
  }

  function confirmClearHistory() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Clear records</p><h2 id="sheet-title">Delete activity history?</h2><p class="sheet-subtitle">This removes care activities but keeps vaccine schedules and completed vaccine records. Active timers will keep running.</p></header>
      <div class="sheet-actions two"><button class="sheet-secondary" data-close-sheet type="button">Cancel</button><button class="sheet-danger" id="confirm-clear" type="button">Clear history</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
    $("#confirm-clear").addEventListener("click", clearHistory);
  }

  function navigate(viewName) {
    if (viewName === "stats") {
      state.statsPeriod = "today";
      $$('[data-period]').forEach((button) => button.classList.toggle("active", button.dataset.period === "today"));
      persistLocalState();
      renderStats();
    }
    $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === viewName));
    $$('[data-nav]').forEach((button) => button.classList.toggle("active", button.dataset.nav === viewName));
    const view = $(`[data-view="${viewName}"]`);
    if (view) view.scrollTop = 0;
    closeSheet();
  }

  function bindGlobalEvents() {
    $$('[data-nav]').forEach((button) => button.addEventListener("click", () => navigate(button.dataset.nav)));
    $$('[data-action]').forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "feed") openFeedSheet();
      if (action === "diaper") openDiaperSheet();
      if (action === "sleep") state.activeSessions?.sleep ? showToast("Sleep is already running · use the timer card to stop", false) : openSleepSheet();
      if (action === "other") openOtherActivitiesSheet();
    }));
    $("#sheet-close").addEventListener("click", closeSheet);
    $("#sheet-backdrop").addEventListener("click", closeSheet);
    $("#timeline").addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-event-id]");
      if (editButton) { openEditActivitySheet(editButton.dataset.editEventId); return; }
      const button = event.target.closest("[data-event-id]");
      if (button) openEventSheet(button.dataset.eventId);
    });
    $("#log-pump").addEventListener("click", openPumpSheet);
    $("#pump-timeline").addEventListener("click", (event) => {
      const editButton = event.target.closest("[data-edit-pump-id]");
      if (editButton) { openEditActivitySheet(editButton.dataset.editPumpId); return; }
      const button = event.target.closest("[data-pump-event-id]");
      if (button) openEventSheet(button.dataset.pumpEventId);
    });
    $$('[data-pump-period]').forEach((button) => button.addEventListener("click", () => {
      state.pumpPeriod = button.dataset.pumpPeriod;
      persistLocalState();
      renderPump();
    }));
    $$('[data-pump-chart-days]').forEach((button) => button.addEventListener("click", () => {
      state.pumpChartDays = Number(button.dataset.pumpChartDays) === 30 ? 30 : 7;
      persistLocalState();
      renderPump();
    }));
    $("#active-sessions").addEventListener("click", (event) => {
      const button = event.target.closest("[data-stop-session]");
      if (!button) return;
      if (button.dataset.stopSession === "sleep") openSleepStopSheet();
      if (button.dataset.stopSession === "feed") stopFeedSession();
      if (button.dataset.stopSession === "other") openOtherStopSheet();
    });
    $("#open-activity-pattern").addEventListener("click", openActivityPattern);
    $("#settings-button").addEventListener("click", openSettings);
    $("#baby-chip").addEventListener("click", () => navigate("baby"));
    $("#edit-profile").addEventListener("click", () => openProfileInfo("profile"));
    $$('[data-profile]').forEach((button) => button.addEventListener("click", () => openProfileInfo(button.dataset.profile)));
    $$('[data-period]').forEach((button) => button.addEventListener("click", () => {
      state.statsPeriod = button.dataset.period;
      $$('[data-period]').forEach((item) => item.classList.toggle("active", item === button));
      saveState();
      renderStats();
    }));
    $('[data-open="range-info"]').addEventListener("click", openRangeInfo);
    $("#schedule-vaccine").addEventListener("click", () => openVaccineForm("schedule"));
    $("#record-vaccine").addEventListener("click", () => openVaccineForm("record"));
    $("#view-vaccine").addEventListener("click", (event) => {
      const complete = event.target.closest("[data-vaccine-complete]");
      if (complete) { openCompleteVaccineSheet(complete.dataset.vaccineComplete); return; }
      const details = event.target.closest("[data-vaccine-open]");
      if (details) openVaccineDetails(details.dataset.vaccineOpen);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSheet();
    });
  }

  function updateStatusTime() {
    const statusTime = $("#status-time");
    if (statusTime) statusTime.textContent = new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(now());
  }

  function setGateStatus(message, isError = false) {
    const status = $("#sync-gate-status");
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  async function openSyncedApp(user) {
    setGateStatus("Loading Cam’s care records…");
    currentUser = user;
    activeStorageKey = `${STORAGE_KEY_PREFIX}-${user.id}-v1`;
    state = loadState(activeStorageKey, user.username === "traph");
    const serverState = await camRequest("/state");
    mergeServerState(serverState, true);
    syncReady = true;
    renderAll();
    updateStatusTime();
    $("#app-stage").classList.remove("is-locked");
    $("#app-stage").setAttribute("aria-hidden", "false");
    $("#sync-gate").classList.add("is-hidden");
    setSyncStatus("synced", "Secure Railway sync");
    syncSnapshot();
    refreshDailyInsight();
    refreshWeeklyInsight();
  }

  async function initializeSync() {
    try {
      const session = await camRequest("/session");
      if (!session.configured) {
        setGateStatus("Cam’s log is taking a nap. Please try again soon.", true);
        $("#sync-access-submit").disabled = true;
        return;
      }
      if (session.authenticated) {
        await openSyncedApp(session.user);
        return;
      }
      setGateStatus("");
      $("#sync-password").focus();
    } catch (error) {
      setGateStatus(error.message || "LittleLog could not reach the server.", true);
    }
  }

  async function submitLogin(event) {
    event.preventDefault();
    const password = $("#sync-password").value;
    const submit = $("#sync-access-submit");
    submit.disabled = true;
    setGateStatus("Opening Cam’s log…");
    try {
      const session = await camRequest("/session", {
        method: "POST",
        body: JSON.stringify({ username: "traph", password })
      });
      $("#sync-password").value = "";
      await openSyncedApp(session.user);
    } catch (error) {
      setGateStatus(error.message || "LittleLog could not sign in.", true);
      $("#sync-password").select();
    } finally {
      submit.disabled = false;
    }
  }

  bindGlobalEvents();
  $("#sync-access-form").addEventListener("submit", submitLogin);
  initializeSync();
  window.addEventListener("online", () => syncSnapshot());
  window.addEventListener("focus", () => {
    refreshFromServer();
    refreshDailyInsight();
    refreshWeeklyInsight();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      refreshFromServer();
      refreshDailyInsight();
      refreshWeeklyInsight();
    }
  });
  setInterval(() => {
    updateStatusTime();
    if (!syncReady) return;
    renderLastFeed();
    if (state.activeSessions?.sleep) renderCharts();
  }, 30000);
  setInterval(refreshFromServer, 45000);
})();
