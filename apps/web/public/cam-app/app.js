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
  const DEFAULT_TIME_RULES = { careDayStart: "20:00", daytimeStart: "06:00", nighttimeStart: "20:00", dailyReportTime: "20:00", weeklyReportTime: "20:00", timeZone: "Asia/Ho_Chi_Minh" };
  const DEFAULT_REMINDER_AGE_MONTHS = 6;
  const normalizeReminderAgeMonths = (value) => Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 24 ? Number(value) : DEFAULT_REMINDER_AGE_MONTHS;
  const OTHER_ACTIVITIES = {
    bath: { type: "bath", title: "Bath", defaultDuration: 10 },
    afternoonCare: { type: "afternoonCare", title: "Afternoon care", defaultDuration: 10 },
    sunbathing: { type: "sunbathing", title: "Sunbathing", defaultDuration: 15 },
    tummyTime: { type: "tummyTime", title: "Tummy time", defaultDuration: 15 },
    walk: { type: "walk", title: "Take a walk", defaultDuration: 30 }
  };
  const AFTERNOON_CARE_ITEMS = [
    { key: "nasal", label: "Nasal clean", short: "Nasal" },
    { key: "eye", label: "Eye clean", short: "Eye" },
    { key: "moisturizing", label: "Moisturizing", short: "Moist." }
  ];
  // The 2026 Vietnam EPI schedule (Circular 52/2025/TT-BYT). Combination products
  // are described by their covered antigens; the clinic confirms the actual product.
  const VACCINE_SERIES = [
    { id: "hepb-birth", name: "Viêm gan B · sơ sinh", tone: "peach", doses: [{ months: 0, timing: "Within 24 hours of birth", detail: "Mũi sơ sinh" }] },
    { id: "bcg", name: "Bệnh lao (BCG)", tone: "lavender", doses: [{ months: 0, days: 28, timing: "Within the first month", detail: "Một mũi" }] },
    { id: "dtp", name: "Bạch hầu · Ho gà · Uốn ván", tone: "rose", doses: [
      { months: 2, timing: "At 2 months", detail: "5 trong 1 · có Viêm gan B, Hib" },
      { months: 3, timing: "At least 1 month after dose 1", detail: "5 trong 1 · có Viêm gan B, Hib" },
      { months: 4, timing: "At least 1 month after dose 2", detail: "5 trong 1 · có Viêm gan B, Hib" },
      { months: 18, timing: "Booster at 18 months; at least 6 months after dose 3", detail: "Mũi nhắc DPT" }
    ] },
    { id: "opv", name: "Bại liệt · uống (OPV)", tone: "blue", doses: [
      { months: 2, timing: "At 2 months" }, { months: 3, timing: "At least 1 month after dose 1" }, { months: 4, timing: "At least 1 month after dose 2" }
    ] },
    { id: "ipv", name: "Bại liệt · tiêm (IPV)", tone: "teal", doses: [
      { months: 5, timing: "At 5 months" }, { months: 9, timing: "At 9 months; at least 1 month after dose 1" }
    ] },
    { id: "rota", name: "Tiêu chảy do Rotavirus", tone: "yellow", doses: [
      { months: 2, timing: "At 2 months" }, { months: 3, timing: "At least 1 month after dose 1; before 6 months" }
    ] },
    { id: "pcv", name: "Phế cầu (PCV)", tone: "mint", note: "Availability varies by local rollout; ask Cam’s clinic.", doses: [
      { months: 2, timing: "At 2 months" }, { months: 4, timing: "At least 2 months after dose 1" }
    ] },
    { id: "measles", name: "Sởi · Rubella", tone: "purple", doses: [
      { months: 9, timing: "At 9 months", detail: "Sởi" }, { months: 18, timing: "Booster at 18 months; at least 1 month after dose 1", detail: "Sởi–Rubella" }
    ] },
    { id: "jev", name: "Viêm não Nhật Bản", tone: "orange", doses: [
      { months: 12, timing: "At 12 months" }, { months: 12, days: 7, timing: "1–2 weeks after dose 1" }, { months: 24, timing: "1 year after dose 1" }
    ] },
    { id: "td", name: "Uốn ván · Bạch hầu (Td)", tone: "slate", doses: [{ months: 84, timing: "Booster at 7 years", detail: "Mũi nhắc liều thấp" }] }
  ];
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
    afternoonCare: '<svg viewBox="0 0 24 24"><path d="M5 6.5h2m3 0h9M5 12h2m3 0h9M5 17.5h2m3 0h9M4.6 6.5l.7.7 1.2-1.4M4.6 12l.7.7 1.2-1.4" /></svg>',
    sunbathing: '<svg viewBox="0 0 24 24"><path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z" /></svg>',
    tummyTime: '<svg viewBox="0 0 24 24"><circle cx="18" cy="7" r="2"/><path d="M4 13c3-3 6-3 9-2l3 2m-9-1-3 4m7-4 1 4m-8 2h16" /></svg>',
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
  const selectedTimeZone = () => timeRules().timeZone;
  const zonedParts = (date) => {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: selectedTimeZone(), year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(date));
    const part = (name) => Number(parts.find((item) => item.type === name)?.value);
    return { year: part("year"), month: part("month"), day: part("day"), hour: part("hour"), minute: part("minute"), second: part("second") };
  };
  const zonedDateKey = (date) => { const value = zonedParts(date); return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}`; };
  const shiftDateKey = (key, days) => { const date = new Date(`${key}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };
  const zonedClockOnKey = (key, clock) => {
    const [year, month, day] = key.split("-").map(Number);
    const [hour, minute] = clock.split(":").map(Number);
    const target = Date.UTC(year, month - 1, day, hour, minute);
    let instant = target;
    for (let step = 0; step < 4; step++) {
      const parts = zonedParts(instant);
      const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      const correction = target - rendered;
      if (!correction) break;
      instant += correction;
    }
    return new Date(instant);
  };
  const shiftZonedDays = (date, days) => { const parts = zonedParts(date); return zonedClockOnKey(shiftDateKey(zonedDateKey(date), days), `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`); };
  const startOfDay = (date = now()) => zonedClockOnKey(zonedDateKey(date), "00:00");
  const formatTime = (date) => new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), hour: "numeric", minute: "2-digit" }).format(new Date(date));
  const validClock = (value, fallback) => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;
  const normalizedTimeRules = (settings) => {
    const rules = Object.fromEntries(Object.entries(DEFAULT_TIME_RULES).filter(([key]) => key !== "timeZone").map(([key, fallback]) => [key, validClock(settings?.[key], fallback)]));
    try {
      rules.timeZone = new Intl.DateTimeFormat("en", { timeZone: settings?.timeZone || DEFAULT_TIME_RULES.timeZone }).resolvedOptions().timeZone;
    } catch {
      rules.timeZone = DEFAULT_TIME_RULES.timeZone;
    }
    if (rules.daytimeStart === rules.nighttimeStart) {
      rules.daytimeStart = DEFAULT_TIME_RULES.daytimeStart;
      rules.nighttimeStart = DEFAULT_TIME_RULES.nighttimeStart;
    }
    return rules;
  };
  const timeRules = () => normalizedTimeRules(state.settings);
  const reminderAgeMonths = () => normalizeReminderAgeMonths(state.settings?.reminderAgeMonths);
  const clockMinutes = (clock) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3));
  const formatClock = (clock, compact = false) => {
    const minutes = typeof clock === "number" ? ((Math.round(clock) % 1440) + 1440) % 1440 : clockMinutes(clock);
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    return `${hour % 12 || 12}${compact && minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`} ${hour < 12 ? "AM" : "PM"}`;
  };
  const atClock = (date, clock) => zonedClockOnKey(zonedDateKey(date), clock);
  const formatDateTime = (date) => new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(date));
  const toLocalDateTimeValue = (date) => {
    const value = zonedParts(date);
    return `${value.year}-${String(value.month).padStart(2, "0")}-${String(value.day).padStart(2, "0")}T${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
  };
  const parseDateTimeInput = (value) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value || "") ? zonedClockOnKey(value.slice(0, 10), value.slice(11, 16)) : new Date(NaN);
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
      settings: { dailyReport: true, weeklyReport: true, ...DEFAULT_TIME_RULES, reminderAgeMonths: DEFAULT_REMINDER_AGE_MONTHS },
      statsPeriod: "today",
      pumpPeriod: "today",
      pumpChartDays: 7,
      growthPeriod: "30",
      vaccinePlanView: "time",
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
        saved.settings = { dailyReport: true, weeklyReport: true, ...DEFAULT_TIME_RULES, reminderAgeMonths: DEFAULT_REMINDER_AGE_MONTHS, ...(saved.settings || {}) };
        saved.statsPeriod ||= "today";
        saved.pumpPeriod ||= "today";
        saved.pumpChartDays = Number(saved.pumpChartDays) === 30 ? 30 : 7;
        saved.growthPeriod = ["30", "90", "all"].includes(saved.growthPeriod) ? saved.growthPeriod : "30";
        saved.vaccinePlanView = saved.vaccinePlanView === "series" ? "series" : "time";
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
  let currentRole = "parent";
  let sessionTicker = null;
  let dailyInsight = null;
  let dailyInsightTimer = null;
  let weeklyInsight = null;
  let weeklyInsightTimer = null;
  let syncReady = false;
  let toastDismissTimer = null;
  let sleepPreviewTimer = null;
  let syncChain = Promise.resolve();
  let lastRenderedCareStart = null;

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
    for (const event of Array.isArray(secondEvents) ? secondEvents : []) {
      const previous = mergedEvents.get(event.id);
      if (previous?.data?.archivedAt && !event.data?.archivedAt) {
        mergedEvents.set(event.id, { ...event, data: { ...event.data, archivedAt: previous.data.archivedAt, archiveVersion: previous.data.archiveVersion } });
      } else mergedEvents.set(event.id, event);
    }

    state.events = [...mergedEvents.values()].filter((event) => !deletedIds.has(event.id));
    state.deletedEventIds = [...deletedIds];
    if (!preferLocal || Number(serverState.revision) > 0) {
      state.activeSessions = serverState.activeSessions || { sleep: null, feed: null, other: null };
      state.activeSessions.other ??= null;
      const localSettings = state.settings || {};
      const remoteSettings = serverState.settings || {};
      const localTime = Date.parse(localSettings.timeRulesUpdatedAt || "") || 0;
      const remoteTime = Date.parse(remoteSettings.timeRulesUpdatedAt || "") || 0;
      const newerRules = localTime > remoteTime ? localSettings : remoteSettings;
      state.settings = {
        dailyReport: true, weeklyReport: true, ...remoteSettings,
        ...normalizedTimeRules(newerRules),
        reminderAgeMonths: normalizeReminderAgeMonths(newerRules.reminderAgeMonths),
        ...(localTime > remoteTime ? { timeRulesUpdatedAt: localSettings.timeRulesUpdatedAt } : {})
      };
    }
    persistLocalState();
  }

  function syncSnapshot() {
    if (!syncReady || currentRole === "observer") return;
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
    if (currentRole === "observer") return;
    persistLocalState();
    syncSnapshot();
  }

  async function refreshFromServer() {
    if (!syncReady) return;
    await syncChain;
    try {
      const previousRules = JSON.stringify(timeRules());
      const serverState = await camRequest("/state");
      mergeServerState(serverState, false);
      const rulesChanged = previousRules !== JSON.stringify(timeRules());
      if (rulesChanged) {
        dailyInsight = null;
        weeklyInsight = null;
        clearTimeout(dailyInsightTimer);
        clearTimeout(weeklyInsightTimer);
      }
      renderAll();
      if (rulesChanged) {
        refreshDailyInsight();
        refreshWeeklyInsight();
      }
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
    let cutoff = new Date(currentWindow.start);
    cutoff = shiftZonedDays(cutoff, -(days - 1));
    const currentTime = now();
    return state.events.filter((event) => !["vaccine", "pump", "growth", "sick"].includes(event.type) && new Date(event.timestamp) >= cutoff && new Date(event.timestamp) <= currentTime);
  }

  function dailyReportWindow() {
    let end = currentCareWindow().start;
    const availableAt = (boundary) => {
      let generation = atClock(boundary, timeRules().dailyReportTime);
      if (generation < boundary) generation = shiftZonedDays(generation, 1);
      return generation;
    };
    while (now() < availableAt(end)) end = shiftZonedDays(end, -1);
    return { start: shiftZonedDays(end, -1), end, nextAvailableAt: availableAt(shiftZonedDays(end, 1)) };
  }

  function dailyReportEvents(dayOffset = 0) {
    let windowEnd = new Date(dailyReportWindow().end);
    windowEnd = shiftZonedDays(windowEnd, dayOffset);
    let windowStart = new Date(windowEnd);
    windowStart = shiftZonedDays(windowStart, -1);
    return state.events.filter((event) => {
      const recordedAt = new Date(event.timestamp);
      return !["vaccine", "pump", "growth", "sick"].includes(event.type) && recordedAt >= windowStart && recordedAt < windowEnd;
    });
  }

  function currentBabyWeek(at = now()) {
    const elapsed = Math.max(0, new Date(at).getTime() - BABY.bornAt.getTime());
    const index = Math.floor(elapsed / WEEK_MS);
    const start = new Date(BABY.bornAt.getTime() + index * WEEK_MS);
    return { weekNumber: index + 1, start, end: new Date(start.getTime() + WEEK_MS) };
  }

  function babyWeekGenerationAt(weekNumber) {
    const weekEnd = new Date(BABY.bornAt.getTime() + weekNumber * WEEK_MS);
    const generation = atClock(weekEnd, timeRules().weeklyReportTime);
    if (generation < weekEnd) return shiftZonedDays(generation, 1);
    return generation;
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
      return !["vaccine", "pump", "growth", "sick"].includes(event.type) && recordedAt >= new Date(start).getTime() && recordedAt < upperBound;
    });
  }

  function currentCareWindow(at = now()) {
    const current = new Date(at);
    let start = atClock(current, timeRules().careDayStart);
    if (current < start) start = shiftZonedDays(start, -1);
    let end = new Date(start);
    end = shiftZonedDays(end, 1);
    return { start, end };
  }

  function careWindowAtOffset(offset = 0, at = now()) {
    const window = currentCareWindow(at);
    let start = new Date(window.start);
    let end = new Date(window.end);
    start = shiftZonedDays(start, offset);
    end = shiftZonedDays(end, offset);
    return { start, end };
  }

  function eventsInCareWindow(window, predicate = () => true, at = now()) {
    return state.events.filter((event) => {
      const recordedAt = new Date(event.timestamp).getTime();
      return recordedAt >= window.start.getTime() && recordedAt < window.end.getTime() && recordedAt <= at.getTime() && predicate(event);
    });
  }

  function eventsForCareDay() {
    return eventsInCareWindow(currentCareWindow(), (event) => event.type !== "vaccine");
  }

  function iconFor(type) {
    return icons[type] || icons.note;
  }

  function timeRangeFor(event) {
    if (!["feed", "sleep", "bath", "afternoonCare", "sunbathing", "tummyTime", "walk", "pump"].includes(event.type)) return "";
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
    const timed = ["feed", "sleep", "bath", "afternoonCare", "sunbathing", "tummyTime", "walk", "pump"].includes(event.type)
      && durationMin > 0
      && !Number.isNaN(start.getTime())
      && !Number.isNaN(end.getTime())
      && end > start;
    return { start: timed ? start : end, end, timed };
  }

  function timelineDayPart(date) {
    const current = new Date(date);
    const currentParts = zonedParts(current);
    const minute = currentParts.hour * 60 + currentParts.minute;
    const { daytimeStart, nighttimeStart } = timeRules();
    const dayStart = clockMinutes(daytimeStart);
    const dayLength = (clockMinutes(nighttimeStart) - dayStart + 1440) % 1440;
    return dayLength && (minute - dayStart + 1440) % 1440 < dayLength ? "day" : "night";
  }

  function timelineCheckpoints(windowStart, firstTime, lastTime) {
    const { careDayStart, daytimeStart, nighttimeStart } = timeRules();
    const dateLabel = new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), weekday: "short", day: "numeric", month: "short" });
    const checkpoints = new Map();
    const add = (date, kind) => {
      const timestamp = date.getTime();
      if (timestamp <= firstTime || timestamp > lastTime) return;
      if (!checkpoints.has(timestamp)) checkpoints.set(timestamp, { date, kinds: new Set() });
      checkpoints.get(timestamp).kinds.add(kind);
    };
    for (let date = startOfDay(windowStart); date.getTime() <= lastTime; date = shiftZonedDays(date, 1)) {
      add(startOfDay(date), "date");
      add(atClock(date, careDayStart), "care");
      add(atClock(date, daytimeStart), "day");
      add(atClock(date, nighttimeStart), "night");
    }
    return [...checkpoints.values()].map(({ date, kinds }) => {
      const details = [];
      if (kinds.has("care")) details.push("Care day begins");
      if (kinds.has("day")) details.push("Daytime begins");
      if (kinds.has("night")) details.push("Nighttime begins");
      const kind = kinds.has("day") ? "day" : kinds.has("night") ? "night" : kinds.has("care") ? "care" : "date";
      const checkpointTime = kinds.has("date") ? "0:00 AM" : formatTime(date);
      const calendarDate = kinds.has("date") && !kinds.has("care") ? ` · ${dateLabel.format(date)}` : "";
      const label = `${checkpointTime}${calendarDate}${details.length ? ` · ${details.join(" · ")}` : ""}`;
      return { date, kind, label };
    });
  }

  function timelineRowsFor(predicate, at = now()) {
    const current = currentCareWindow(at);
    const previous = careWindowAtOffset(-1, at);
    const events = eventsInCareWindow({ start: previous.start, end: current.end }, predicate, at);
    if (!events.length) return [];

    const intervals = events.map(timelineInterval);
    const firstTime = Math.max(previous.start.getTime(), Math.min(...intervals.map(({ start }) => start.getTime())));
    // Keep the care-day divider visible while waiting for the new care day's first entry.
    const lastTime = Math.max(current.start.getTime(), ...intervals.map(({ end }) => end.getTime()));
    const checkpoints = timelineCheckpoints(previous.start, firstTime, lastTime);
    const activityRows = events.flatMap((event) => splitTimelineEvent(event, checkpoints, previous.start))
      .map((event) => ({ type: "activity", time: event.timelineSortTime, event }));
    const checkpointRows = checkpoints.map((checkpoint) => ({ type: "checkpoint", time: checkpoint.date.getTime(), checkpoint }));
    return [...activityRows, ...checkpointRows].sort((a, b) => b.time - a.time || Number(b.type === "activity") - Number(a.type === "activity"));
  }

  function splitTimelineEvent(event, checkpoints, windowStart) {
    const interval = timelineInterval(event);
    if (!interval.timed) {
      return [{ ...event, timelineKind: timelineDayPart(interval.end), timelineSortTime: interval.end.getTime() }];
    }
    const start = new Date(Math.max(interval.start.getTime(), windowStart.getTime()));
    const boundaries = checkpoints
      .map((checkpoint) => checkpoint.date)
      .filter((date) => date > start && date < interval.end)
      .sort((a, b) => a - b);
    const points = [start, ...boundaries, interval.end];
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
        timelineContinues: endsAtCheckpoint,
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
    const timedTypes = ["feed", "sleep", "bath", "afternoonCare", "sunbathing", "tummyTime", "walk"];
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
    } else if (["sleep", "bath", "afternoonCare", "sunbathing", "tummyTime", "walk"].includes(event.type)) {
      detailText = timeRange;
    }
    detail.className = "timeline-detail";
    detail.textContent = detailText;
    copy.append(heading);
    if (detailText) copy.append(detail);
    if (event.type === "feed" && event.data?.vitaminD && !event.timelineContinues) {
      const vitaminD = document.createElement("small");
      vitaminD.className = "timeline-note timeline-vitamin-d";
      vitaminD.textContent = "Vitamin D included";
      copy.append(vitaminD);
    }
    if (event.type === "afternoonCare" && !event.timelineContinues) {
      const checked = afternoonCareLabels(event.data?.checks);
      if (checked.length) {
        const checklist = document.createElement("small");
        checklist.className = "timeline-note timeline-care-checks";
        checklist.textContent = checked.map((label) => `✓ ${label}`).join(" · ");
        copy.append(checklist);
      }
    }
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
    const rows = timelineRowsFor((event) => !["vaccine", "pump", "growth", "sick"].includes(event.type));
    timeline.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "timeline-empty";
      empty.textContent = "No activity logged in either care day yet.";
      timeline.appendChild(empty);
      return;
    }
    rows.forEach((row) => {
      if (row.type === "activity") {
        timeline.appendChild(createTimelineItem(row.event));
        return;
      }
      const checkpoint = document.createElement("div");
      checkpoint.className = `timeline-checkpoint ${row.checkpoint.kind}`;
      const checkpointIcon = row.checkpoint.kind === "day" ? icons.sunbathing : ["date", "care"].includes(row.checkpoint.kind) ? icons.date : icons.sleep;
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
    const tummyTime = events.filter((event) => event.type === "tummyTime");
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
      tummyTime: tummyTime.length,
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

  function careRemindersActive(current = now()) {
    const birthParts = zonedParts(BABY.bornAt);
    const cutoffKey = new Date(Date.UTC(birthParts.year, birthParts.month - 1 + reminderAgeMonths(), birthParts.day, 12)).toISOString().slice(0, 10);
    const cutoff = zonedClockOnKey(cutoffKey, `${String(birthParts.hour).padStart(2, "0")}:${String(birthParts.minute).padStart(2, "0")}`);
    return current >= BABY.bornAt && current < cutoff;
  }

  function afternoonCareLabels(checks, short = false) {
    const selected = Array.isArray(checks) ? checks : [];
    return AFTERNOON_CARE_ITEMS.filter((item) => selected.includes(item.key)).map((item) => short ? item.short : item.label);
  }

  function renderVitaminDReminder() {
    const reminder = $("#vitamin-d-reminder");
    const feedCard = $(".last-feed-card");
    const current = now();
    if (!careRemindersActive(current)) {
      reminder.hidden = true;
      feedCard.classList.remove("has-reminder");
      return;
    }
    const feed = eventsInCareWindow(currentCareWindow(current), (event) => event.type === "feed" && event.data?.vitaminD === true, current)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    reminder.hidden = false;
    feedCard.classList.add("has-reminder");
    reminder.dataset.state = feed ? "given" : "due";
    $("#vitamin-d-reminder-text").textContent = feed ? "Vitamin D given" : "Vitamin D due today";
    $("#vitamin-d-reminder-time").hidden = !feed;
    $("#vitamin-d-reminder-time").textContent = feed ? formatTime(feed.timestamp) : "";
  }

  function renderAfternoonCareReminder() {
    const reminder = $("#afternoon-care-reminder");
    const current = now();
    if (!careRemindersActive(current)) { reminder.hidden = true; return; }
    const care = eventsInCareWindow(currentCareWindow(current), (event) => event.type === "afternoonCare", current)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    reminder.hidden = false;
    reminder.dataset.state = care ? "given" : "due";
    const checks = care ? afternoonCareLabels(care.data?.checks, true) : [];
    const message = care ? `Afternoon care done · ${checks.length ? checks.join(", ") : "No items checked"}` : "Afternoon care due today";
    $("#afternoon-care-reminder-text").textContent = message;
    $("#afternoon-care-reminder-time").hidden = !care;
    $("#afternoon-care-reminder-time").textContent = care ? formatTime(care.timestamp) : "";
    reminder.title = `${message}${care ? ` · ${formatTime(care.timestamp)}` : ""}`;
  }

  function statsForCareWindow(window, at) {
    const events = eventsInCareWindow(window, (event) => !["vaccine", "pump"].includes(event.type), at);
    const totals = totalsFor(events);
    const start = window.start.getTime();
    const end = Math.min(window.end.getTime(), at.getTime());
    const overlapMinutes = (from, to) => Math.max(0, Math.min(to, end) - Math.max(from, start)) / 60000;
    const completedSleep = state.events.reduce((minutes, event) => {
      if (event.type !== "sleep" || new Date(event.timestamp) > at) return minutes;
      const interval = timelineInterval(event);
      return interval.timed ? minutes + overlapMinutes(interval.start.getTime(), interval.end.getTime()) : minutes;
    }, 0);
    const sleepStart = new Date(state.activeSessions?.sleep?.startedAt).getTime();
    const activeSleep = Number.isFinite(sleepStart) ? overlapMinutes(sleepStart, at.getTime()) : 0;
    return { ...totals, sleepMinutes: completedSleep + activeSleep };
  }

  function renderTodaySignals() {
    const at = now();
    const totals = statsForCareWindow(currentCareWindow(at), at);
    const reference = referenceForAgeDays();
    const sleepMinutes = totals.sleepMinutes;
    const milkMl = totals.bottles;
    const countScaleMax = (range, value) => Math.ceil(Math.max(range.max + 4, range.max * 1.35, value * 1.1) / 2) * 2;
    const milkScaleMax = Math.ceil(Math.max(reference.bottleMl.max + 200, reference.bottleMl.max * 1.35, milkMl * 1.1) / 100) * 100;
    const sleepScaleMax = Math.ceil(Math.max(24, (sleepMinutes / 60) * 1.1) / 2) * 2;
    const comparisons = [
      { key: "feeds", label: "Feeds", value: totals.feeds, range: reference.feeds, scaleMax: countScaleMax(reference.feeds, totals.feeds), display: String(totals.feeds) },
      { key: "milk", label: "Milk", value: milkMl, range: reference.bottleMl, scaleMax: milkScaleMax, display: `${Math.round(milkMl)} ml`, unit: " ml" },
      { key: "diapers", label: "Diapers", value: totals.diapers, range: reference.diapers, scaleMax: countScaleMax(reference.diapers, totals.diapers), display: `${totals.diapers} (${totals.wet}/${totals.dirty})`, displayMarkup: `<span class="diaper-total">${totals.diapers}</span> (<span class="diaper-wet">${totals.wet}</span>/<span class="diaper-dirty">${totals.dirty}</span>)`, description: `${totals.diapers} total, ${totals.wet} wet, ${totals.dirty} dirty` },
      { key: "sleep", label: "Sleep", value: sleepMinutes / 60, range: reference.sleepHours, scaleMax: sleepScaleMax, display: formatDuration(sleepMinutes), unit: "h" }
    ];
    $("#comparison-list").innerHTML = comparisons.map((item) => {
      const position = Math.max(0, Math.min(100, (item.value / item.scaleMax) * 100));
      const { min, max } = item.range;
      const typicalStart = min * 100 / item.scaleMax;
      const typicalEnd = max * 100 / item.scaleMax;
      const unit = item.unit || "";
      const ticks = [min, (min + max) / 2, max].map((value, index) =>
        `<span class="comparison-tick${index === 1 ? " comparison-tick-middle" : ""}" style="--tick-position:${value * 100 / item.scaleMax}%"><span>${value.toLocaleString("en")}</span></span>`
      ).join("");
      return `
        <div class="comparison-row signal-${item.key}">
          <strong class="comparison-label" aria-hidden="true">${item.label}</strong>
          <div class="comparison-track-wrap">
            <div class="comparison-track" role="img" aria-label="${item.label}: ${item.description || item.display}; reference ${min}${unit} to ${max}${unit}; scale zero to ${item.scaleMax}${unit}"
              data-position="${position}" style="--cam-position:${position}%;--typical-start:${typicalStart}%;--typical-width:${typicalEnd - typicalStart}%;--typical-end:${typicalEnd}%">
              <span class="comparison-zone range-below"></span><span class="comparison-zone range-reference"></span><span class="comparison-zone range-above"></span>
              ${ticks}
              <span class="comparison-endpoint">0</span><span class="comparison-endpoint max">${item.scaleMax.toLocaleString("en")}${unit}</span>
              <span class="comparison-pin"></span><strong class="comparison-current">${item.displayMarkup || item.display}</strong>
            </div>
          </div>
        </div>`;
    }).join("");
    layoutComparisonPins();
  }

  function layoutComparisonPins() {
    $$("#comparison-list .comparison-row").forEach((row) => {
      const track = $(".comparison-track", row);
      const rail = track.getBoundingClientRect();
      if (!rail.width) return;

      const value = $(".comparison-current", row);
      const halfWidth = value.getBoundingClientRect().width / 2;
      const pinX = rail.width * Number(track.dataset.position) / 100;
      const valueX = Math.max(halfWidth, Math.min(rail.width - halfWidth, pinX));
      const labelRight = $(".comparison-label", row).getBoundingClientRect().right;
      const valueLeft = rail.left + valueX - halfWidth;
      const pinBelow = valueLeft < labelRight + 6;
      row.classList.remove("compact-ticks");
      const tickLabels = $$(".comparison-tick span", track).map((label) => label.getBoundingClientRect());
      const crowdedTicks = tickLabels[0].right + 3 > tickLabels[1].left || tickLabels[1].right + 3 > tickLabels[2].left;

      track.style.setProperty("--value-position", `${valueX / rail.width * 100}%`);
      row.classList.toggle("pin-below", pinBelow);
      row.classList.toggle("compact-ticks", crowdedTicks);
    });
  }

  function statsTrendDays(dayCount) {
    const days = [];
    const at = now();
    for (let offset = -(dayCount - 1); offset <= 0; offset += 1) {
      const window = careWindowAtOffset(offset, at);
      let date = startOfDay(at);
      date = shiftZonedDays(date, offset);
      const beforeBirth = window.end <= BABY.bornAt;
      const birthCareDay = window.start <= BABY.bornAt && BABY.bornAt < window.end;
      const totals = beforeBirth ? null : statsForCareWindow(window, at);
      const reference = beforeBirth ? null : referenceForAgeDays(babyAgeDays(window.end));
      days.push({
        date,
        careDayEnd: window.end,
        beforeBirth,
        birthCareDay,
        reference,
        feeds: totals?.feeds || 0,
        milk: totals?.bottles || 0,
        diapers: totals?.diapers || 0,
        sleep: (totals?.sleepMinutes || 0) / 60,
        feedsLogged: !!totals?.feeds,
        milkLogged: !!totals?.bottles,
        diapersLogged: !!totals?.diapers,
        sleepLogged: !!totals?.sleepMinutes
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
    const height = 202;
    const plot = { left: 36, right: requestedDays === 7 ? 22 : 15, top: 28, bottom: 49 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const rangeFor = (day) => day.reference[metric.rangeKey];
    const observed = days.filter((day) => day[metric.loggedKey]).map((day) => day[metric.key]);
    const firstReferenceIndex = days.findIndex((day) => day.reference);
    const referenceDays = firstReferenceIndex < 0 ? [] : days.slice(firstReferenceIndex);
    const rawMax = Math.max(1, ...observed, ...referenceDays.map((day) => rangeFor(day).max));
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
    const axis = renderChartYAxis(plot, width, scaleMax, y, metric.unit, metric.axisFormat);
    const lastIndex = days.length - 1;
    const dateFormat = new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), day: "numeric", month: "short" });
    const dateLabels = days.map((day, index) => {
      if (requestedDays === 7) return `<text class="signal-chart-date" x="${x(index)}" y="${height - 14}" text-anchor="middle">${index === lastIndex ? dateFormat.format(day.date) : zonedParts(day.date).day}</text>`;
      const monthStart = zonedParts(day.date).day === 1;
      const fiveDayStep = (lastIndex - index) % 5 === 0;
      if (!fiveDayStep && !monthStart) return "";
      const adjacentStep = monthStart && ((lastIndex - index + 1) % 5 === 0 || (lastIndex - index - 1) % 5 === 0);
      const dateY = height - (adjacentStep ? 24 : 36);
      const month = monthStart ? `<text class="signal-chart-month" x="${x(index)}" y="${dateY + 13}" text-anchor="middle">${new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), month: "short" }).format(day.date)}</text>` : "";
      return `<line class="signal-date-tick" x1="${x(index)}" y1="${y(0)}" x2="${x(index)}" y2="${y(0) + 4}" /><text class="signal-chart-date" x="${x(index)}" y="${dateY}" text-anchor="middle">${zonedParts(day.date).day}</text>${month}`;
    }).join("");
    const points = days.map((day, index) => {
      if (!day[metric.loggedKey]) return "";
      return `<circle class="signal-chart-point" cx="${x(index)}" cy="${y(day[metric.key])}" r="${requestedDays === 7 ? 3.7 : 2.6}"><title>${dateFormat.format(day.date)}, care day ending ${dateFormat.format(day.careDayEnd)} at ${formatClock(timeRules().careDayStart)} · ${metric.valueFormat(day[metric.key])}</title></circle>`;
    }).join("");
    let previousDotValue = null;
    let previousLabelBelow = false;
    const pointValues = (requestedDays === 7 || metric.key === "feeds" || metric.key === "diapers") ? days.map((day, index) => {
      if (!day[metric.loggedKey]) return "";
      const currentValue = day[metric.key];
      const below = previousDotValue !== null && (currentValue < previousDotValue || (currentValue === previousDotValue && !previousLabelBelow));
      const offset = below ? 17 : -9;
      previousDotValue = currentValue;
      previousLabelBelow = below;
      const value = metric.axisFormat ? metric.axisFormat(day[metric.key]) : Math.round(day[metric.key]);
      return `<text class="signal-chart-value" x="${x(index)}" y="${y(day[metric.key]) + offset}" text-anchor="middle">${value}</text>`;
    }).join("") : "";
    const hasValues = observed.length > 0;
    const band = referenceDays.length ? `<path class="signal-reference-band" d="${trendReferenceBand(referenceDays, rangeFor, (index) => x(firstReferenceIndex + index), y)}" />` : "";
    const birth = renderBirthBoundary(days, plot, x, height);
    return `<article class="signal-trend-card signal-trend-${metric.key}${requestedDays === 30 ? " signal-trend-30" : ""}"><header class="signal-trend-heading"><strong>${metric.label}</strong></header><div class="signal-line-chart"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.label} over the last ${requestedDays} care days, with an age-adjusted reference range${birth.marker ? "; Cam’s birth day is marked" : ""}">${birth.background}${axis}${band}${birth.marker}${linePath ? `<path class="signal-chart-line" d="${linePath.trim()}" />` : ""}${points}${pointValues}${dateLabels}${hasValues ? "" : `<text class="signal-chart-empty" x="${plot.left + plotWidth / 2}" y="${plot.top + plotHeight / 2}" text-anchor="middle">No logged ${metric.label.toLowerCase()} yet</text>`}</svg></div></article>`;
  }

  function renderTrendSignals(dayCount) {
    const days = statsTrendDays(dayCount);
    const metrics = [
      { key: "feeds", loggedKey: "feedsLogged", rangeKey: "feeds", label: "Feeds", unit: "No.", scaleMax: (max) => Math.ceil(max * 1.2 / 2) * 2, valueFormat: (value) => `${Number(value.toFixed(1))} feeds` },
      { key: "milk", loggedKey: "milkLogged", rangeKey: "bottleMl", label: "Milk", unit: "ml", scaleMax: (max) => Math.ceil(max * 1.15 / 100) * 100, valueFormat: (value) => `${Math.round(value)} ml` },
      { key: "diapers", loggedKey: "diapersLogged", rangeKey: "diapers", label: "Diapers", unit: "No.", scaleMax: (max) => Math.ceil(max * 1.2 / 2) * 2, valueFormat: (value) => `${Number(value.toFixed(1))} diapers` },
      { key: "sleep", loggedKey: "sleepLogged", rangeKey: "sleepHours", label: "Sleep", unit: "h", scaleMax: (max) => Math.max(24, Math.ceil(max * 1.1 / 2) * 2), axisFormat: (value) => Number(value.toFixed(1)), valueFormat: (value) => `${Number(value.toFixed(1))}h` }
    ];
    $("#stats-trend-charts").innerHTML = metrics.map((metric) => renderSignalTrend(metric, days, dayCount)).join("");
  }

  function renderStats() {
    const todaySelected = state.statsPeriod === "today";
    $("#stats-today-panel").hidden = !todaySelected;
    $("#stats-trend-panel").hidden = todaySelected;
    if (todaySelected) renderTodaySignals();
    else renderTrendSignals(state.statsPeriod === "month" ? 30 : 7);
    renderGrowth();
  }

  function growthChart(metric, unit, entries, periodStart, periodEnd) {
    const width = 340, height = 156;
    const plot = { left: 40, right: 13, top: 17, bottom: 30 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const values = entries.map((item) => item.value);
    const low = values.length ? Math.max(0, Math.floor((Math.min(...values) - (metric === "Weight" ? .35 : 3)) * (metric === "Weight" ? 10 : 1)) / (metric === "Weight" ? 10 : 1)) : 0;
    const high = values.length ? Math.max(low + 1, Math.ceil(Math.max(...values) + (metric === "Weight" ? .35 : 3))) : 1;
    const x = (date) => plot.left + (new Date(date).getTime() - periodStart) / Math.max(1, periodEnd - periodStart) * plotWidth;
    const y = (value) => plot.top + (high - value) / (high - low) * plotHeight;
    const ticks = values.length ? [0, .5, 1].map((fraction) => {
      const value = low + (high - low) * (1 - fraction);
      const tickY = plot.top + fraction * plotHeight;
      return `<line x1="${plot.left}" y1="${tickY}" x2="${width - plot.right}" y2="${tickY}" class="growth-grid"/><text x="${plot.left - 5}" y="${tickY + 4}" text-anchor="end" class="growth-axis">${Number(value.toFixed(1))}</text>`;
    }).join("") : "";
    const dateText = (time) => new Intl.DateTimeFormat("en", { timeZone: timeRules().timeZone, month: "short", day: "numeric" }).format(new Date(time));
    const dateTicks = [periodStart, (periodStart + periodEnd) / 2, periodEnd].map((time, index) => `<text x="${plot.left + index * plotWidth / 2}" y="${height - 6}" text-anchor="${index === 0 ? "start" : index === 2 ? "end" : "middle"}" class="growth-axis">${dateText(time)}</text>`).join("");
    const coordinates = entries.map((entry) => `${x(entry.timestamp)},${y(entry.value)}`).join(" ");
    const points = entries.map((entry) => `<circle cx="${x(entry.timestamp)}" cy="${y(entry.value)}" r="3.8" class="growth-point"><title>${dateText(entry.timestamp)} · ${entry.value} ${unit}</title></circle>`).join("");
    return `<article class="growth-chart-card"><div class="growth-chart-heading"><strong>${metric}</strong><span>${unit}</span></div><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric} over time">${ticks}${dateTicks}${entries.length > 1 ? `<polyline class="growth-line" points="${coordinates}" />` : ""}${points}${entries.length ? "" : `<text class="growth-empty" x="${width / 2}" y="${height / 2}" text-anchor="middle">No ${metric.toLowerCase()} measurements yet</text>`}</svg></article>`;
  }

  function renderGrowth() {
    if (currentRole === "observer") {
      $("#growth-charts").replaceChildren();
      $("#growth-health-list").replaceChildren();
      return;
    }
    const period = state.growthPeriod || "30";
    $$('[data-growth-period]').forEach((button) => button.classList.toggle("active", button.dataset.growthPeriod === period));
    const end = Date.now();
    const start = period === "all" ? BABY.bornAt.getTime() : end - Number(period) * 86400000;
    const records = state.events.filter((event) => event.type === "growth" && new Date(event.timestamp).getTime() >= start && new Date(event.timestamp).getTime() <= end);
    const pointsFor = (key) => records.map((event) => ({ timestamp: event.timestamp, value: Number(event.data?.[key]) })).filter((item) => Number.isFinite(item.value) && item.value > 0).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const birthWeight = { timestamp: BABY.bornAt.toISOString(), value: BABY.birthWeightKg };
    const weight = pointsFor("weightKg");
    if (start <= BABY.bornAt.getTime()) weight.unshift(birthWeight);
    $("#growth-charts").innerHTML = growthChart("Weight", "kg", weight, start, end) + growthChart("Height", "cm", pointsFor("heightCm"), start, end);
    const recent = state.events.filter((event) => ["growth", "sick"].includes(event.type)).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 6);
    $("#growth-health-list").innerHTML = recent.length ? `<h4>Recent records</h4>${recent.map((event) => `<article class="growth-health-row"><div><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(new Intl.DateTimeFormat("en", { timeZone: timeRules().timeZone, month: "short", day: "numeric", year: "numeric" }).format(new Date(event.timestamp)))}</small><p>${escapeHtml(event.detail)}</p></div><button type="button" data-growth-edit="${escapeHtml(event.id)}" aria-label="Edit ${escapeHtml(event.title)}">${preferenceEditIcon()}</button></article>`).join("")}` : '<p class="growth-empty-copy">Add a measurement or health note to see it here.</p>';
  }

  function renderCharts() {
    renderStats();
  }

  function pumpEventsForCareDay() {
    return eventsInCareWindow(currentCareWindow(), (event) => event.type === "pump")
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  function pumpEventsSince(days) {
    let cutoff = new Date(currentCareWindow().start);
    cutoff = shiftZonedDays(cutoff, -(days - 1));
    return state.events.filter((event) => event.type === "pump" && new Date(event.timestamp) >= cutoff && new Date(event.timestamp) <= now());
  }

  function pumpEventsForPeriod() {
    if (state.pumpPeriod === "month") return pumpEventsSince(30);
    if (state.pumpPeriod === "week") return pumpEventsSince(7);
    return pumpEventsForCareDay();
  }

  function pumpVolumes(event) {
    const recordedLeft = Number(event.data?.leftMl) || 0;
    const recordedRight = Number(event.data?.rightMl) || 0;
    const totalMl = Math.max(0, recordedLeft + recordedRight);
    // Keep the recorded sum if an older entry contains a negative split.
    const leftMl = Math.max(0, Math.min(totalMl, recordedLeft));
    return { leftMl, rightMl: totalMl - leftMl, totalMl };
  }

  function pumpTotals(events) {
    return events.reduce((totals, event) => {
      const { leftMl, rightMl, totalMl } = pumpVolumes(event);
      totals.count += 1;
      totals.durationMin += Number(event.data?.durationMin || 0);
      totals.leftMl += leftMl;
      totals.rightMl += rightMl;
      totals.totalMl += totalMl;
      return totals;
    }, { count: 0, durationMin: 0, leftMl: 0, rightMl: 0, totalMl: 0 });
  }

  function pumpTimelineDetails(at) {
    const pumps = state.events
      .filter((event) => event.type === "pump" && new Date(event.timestamp) <= at)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const details = new Map();
    let dayStart = null;
    let number = 0;
    let previousTime = null;
    for (const pump of pumps) {
      const time = new Date(pump.timestamp);
      const start = currentCareWindow(time).start.getTime();
      number = start === dayStart ? number + 1 : 1;
      dayStart = start;
      const gap = previousTime === null ? null : (time - previousTime) / 60000;
      details.set(pump.id, { number, gap, durationMin: Number(pump.data?.durationMin || 0) });
      previousTime = time;
    }
    return details;
  }

  function renderPumpTimeline() {
    const timeline = $("#pump-timeline");
    const at = now();
    const rows = timelineRowsFor((event) => event.type === "pump", at);
    timeline.classList.toggle("has-entries", rows.length > 0);
    if (!rows.length) {
      timeline.innerHTML = '<div class="pump-timeline-empty">No milk pumping logged in either care day yet.</div>';
      return;
    }
    const details = pumpTimelineDetails(at);
    const ordinal = new Intl.PluralRules("en", { type: "ordinal" });
    const suffix = { one: "st", two: "nd", few: "rd", other: "th" };
    const separator = '<span class="pump-entry-separator" aria-hidden="true">·</span>';
    timeline.innerHTML = rows.map((row) => {
      if (row.type === "checkpoint") {
        const checkpointIcon = row.checkpoint.kind === "day" ? icons.sunbathing : ["date", "care"].includes(row.checkpoint.kind) ? icons.date : icons.sleep;
        return `<div class="timeline-checkpoint pump-timeline-checkpoint ${row.checkpoint.kind}">${checkpointIcon}<span>${row.checkpoint.label}</span></div>`;
      }
      const event = row.event;
      const dayPart = event.timelineKind || timelineDayPart(event.timestamp);
      const eventId = escapeHtml(event.id);
      const { number, gap, durationMin } = details.get(event.id);
      const badge = `${number}${suffix[ordinal.select(number)]}`;
      const time = formatTime(event.timestamp);
      const duration = formatDuration(event.timelineContinues ? event.data.durationMin : durationMin);
      const timeAndDuration = `<time datetime="${escapeHtml(event.timestamp)}">${time}</time>${separator}<span>${duration}</span>`;
      if (event.timelineContinues) {
        return `
          <article class="pump-event pump-event-segment ${dayPart}">
            <div class="pump-entry-meta">
              <button class="pump-entry-open pump-entry-values" type="button" data-pump-event-id="${eventId}">
                ${timeAndDuration}${separator}<span class="pump-entry-continuation">Pump continues above</span>
              </button>
            </div>
          </article>`;
      }
      const { leftMl, rightMl, totalMl } = pumpVolumes(event);
      const leftShare = totalMl > 0 ? leftMl * 100 / totalMl : 0;
      const leftPercent = Number(leftShare.toFixed(1));
      const rightPercent = totalMl > 0 ? Number((100 - leftPercent).toFixed(1)) : 0;
      const gapDuration = gap === null ? "" : formatDuration(gap);
      const note = String(event.data?.note || "").trim();
      return `
        <article class="pump-event ${dayPart}">
          <div class="pump-entry-meta">
            <button class="pump-entry-open" data-pump-event-id="${eventId}" type="button">
              <span class="pump-entry-icon">${badge}</span><span class="sr-only">pump, </span>
              <span class="pump-entry-values">
                <strong>${totalMl} ml</strong>${separator}${timeAndDuration}
                ${gapDuration ? `${separator}<span class="pump-entry-gap" title="${gapDuration} since last pump">${gapDuration} gap</span>` : ""}
              </span>
            </button>
            <button class="pump-entry-edit" data-edit-pump-id="${eventId}" type="button" aria-label="Edit ${badge} pump"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.3 2.3 0 0 0-3.2-3.2L4.8 16.8 4 16Zm10-8 3.2 3.2" /></svg></button>
          </div>
          <div class="pump-balance" role="img" aria-label="Left breast ${leftMl} ml, ${leftPercent}%. Right breast ${rightMl} ml, ${rightPercent}%."
            style="--pump-left-share:${leftShare}%">
            <span class="pump-balance-label pump-left">Left</span>
            <div class="pump-balance-track">
              <div class="pump-balance-rail">
                ${totalMl > 0 ? '<span class="pump-balance-fill pump-left"></span><span class="pump-balance-fill pump-right"></span>' : ""}
              </div>
              ${totalMl > 0 ? '<span class="pump-balance-pin"></span>' : ""}
            </div>
            <span class="pump-balance-label pump-right">Right</span>
            <div class="pump-balance-values">
              <span><strong>${leftMl} ml</strong> · ${leftPercent}%</span>
              <span><strong>${rightMl} ml</strong> · ${rightPercent}%</span>
            </div>
          </div>
          ${note ? `<p class="pump-entry-note">${escapeHtml(note)}</p>` : ""}
        </article>`;
    }).join("");
  }

  function renderPumpSummary() {
    const events = pumpEventsForPeriod();
    const totals = pumpTotals(events);
    const divisor = Math.max(1, totals.count);
    const averageDuration = totals.count ? totals.durationMin / divisor : 0;
    const averageLeft = totals.count ? totals.leftMl / divisor : 0;
    const averageRight = totals.count ? totals.rightMl / divisor : 0;
    $("#pump-summary").innerHTML = `
      <div class="pump-overview">
        <span><small>No. of pumps</small><strong>${totals.count}</strong></span>
        <span><small>Avg. duration</small><strong>${formatDuration(averageDuration)}</strong></span>
        <span><small>Total duration</small><strong>${formatDuration(totals.durationMin)}</strong></span>
      </div>
      <div class="pump-side-summary">
        <article class="pump-left"><h4>Left breast</h4><div><small>Total pumped</small><strong>${Math.round(totals.leftMl)} ml</strong></div><div><small>Average / pump</small><strong>${Math.round(averageLeft)} ml</strong></div></article>
        <article class="pump-right"><h4>Right breast</h4><div><small>Total pumped</small><strong>${Math.round(totals.rightMl)} ml</strong></div><div><small>Average / pump</small><strong>${Math.round(averageRight)} ml</strong></div></article>
      </div>`;
  }

  function renderChartYAxis(plot, width, scaleMax, y, unit, formatTick = Math.round) {
    const labelX = plot.left - 6;
    const ticks = [0, .25, .5, .75, 1].map((ratio) => {
      const value = scaleMax * ratio;
      const gridY = y(value);
      return `<line class="chart-axis-grid" x1="${plot.left}" y1="${gridY}" x2="${width - plot.right}" y2="${gridY}" /><text class="chart-axis-tick" x="${labelX}" y="${gridY + 4}" text-anchor="end">${formatTick(value)}</text>`;
    }).join("");
    return `<text class="chart-axis-unit" x="${labelX}" y="${plot.top - 12}" text-anchor="end">${unit}</text>${ticks}`;
  }

  function renderBirthBoundary(days, plot, x, height) {
    const index = days.findIndex((day) => day.birthCareDay);
    if (index < 0 || !days.some((day) => day.beforeBirth)) return { background: "", marker: "" };
    const birthX = x(index);
    const baseline = height - plot.bottom;
    const shadeWidth = Math.max(0, birthX - plot.left);
    const birthLabel = new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), day: "numeric", month: "short" }).format(BABY.bornAt);
    const anchor = birthX > (plot.left + x(days.length - 1)) / 2 ? "end" : "start";
    const labelX = birthX + (anchor === "end" ? -5 : 5);
    const background = `<rect class="chart-prebirth-area" x="${plot.left}" y="${plot.top}" width="${shadeWidth}" height="${baseline - plot.top}" />${shadeWidth > 90 ? `<text class="chart-prebirth-label" x="${plot.left + shadeWidth / 2}" y="${plot.top + (baseline - plot.top) / 2}" text-anchor="middle">Before birth</text>` : ""}`;
    const marker = `<line class="chart-birth-line" x1="${birthX}" y1="${plot.top}" x2="${birthX}" y2="${baseline}" /><text class="chart-birth-label" x="${labelX}" y="${plot.top - 8}" text-anchor="${anchor}">Born · ${birthLabel}</text>`;
    return { background, marker };
  }

  function renderPumpChart() {
    const dayCount = Number(state.pumpChartDays) === 30 ? 30 : 7;
    const days = [];
    const at = now();
    for (let offset = -(dayCount - 1); offset <= 0; offset += 1) {
      const window = careWindowAtOffset(offset, at);
      const beforeBirth = window.end <= BABY.bornAt;
      const birthCareDay = window.start <= BABY.bornAt && BABY.bornAt < window.end;
      const dayEvents = beforeBirth ? [] : eventsInCareWindow(window, () => true, at);
      const pumped = pumpTotals(dayEvents.filter((event) => event.type === "pump")).totalMl;
      const fed = dayEvents
        .filter((event) => event.type === "feed" && event.data?.mode === "bottle")
        .reduce((sum, event) => sum + Number(event.data?.amount || 0), 0);
      let date = startOfDay(at);
      date = shiftZonedDays(date, offset);
      days.push({ date, beforeBirth, birthCareDay, pumped, fed });
    }
    const width = 330;
    const height = 190;
    const observedMax = Math.max(0, ...days.flatMap((day) => [day.pumped, day.fed]));
    const scaleMax = Math.max(100, Math.ceil(observedMax / 100) * 100);
    const plot = { left: Math.max(33, 9 + String(scaleMax).length * 7), right: 20, top: 26, bottom: 30 };
    const plotWidth = width - plot.left - plot.right;
    const plotHeight = height - plot.top - plot.bottom;
    const x = (index) => plot.left + (index / Math.max(1, days.length - 1)) * plotWidth;
    const y = (value) => plot.top + plotHeight - (value / scaleMax) * plotHeight;
    const recordedDays = days.map((day, index) => ({ day, index })).filter(({ day }) => !day.beforeBirth);
    const pumpedPoints = recordedDays.map(({ day, index }) => `${x(index).toFixed(1)},${y(day.pumped).toFixed(1)}`).join(" ");
    const fedPoints = recordedDays.map(({ day, index }) => `${x(index).toFixed(1)},${y(day.fed).toFixed(1)}`).join(" ");
    const axis = renderChartYAxis(plot, width, scaleMax, y, "ml");
    const dateFormat = new Intl.DateTimeFormat("en-US", { timeZone: selectedTimeZone(), day: "numeric", month: "short" });
    const tickCount = days.length <= 7 ? days.length : 6;
    const labels = Array.from({ length: tickCount }, (_, tick) => {
      const index = Math.round(tick * (days.length - 1) / Math.max(1, tickCount - 1));
      return `<text class="chart-date-label" x="${x(index)}" y="${height - 8}" text-anchor="middle">${dayCount === 7 && index !== days.length - 1 ? zonedParts(days[index].date).day : dateFormat.format(days[index].date)}</text>`;
    }).join("");
    const points = days.map((day, index) => {
      if (day.beforeBirth) return "";
      const label = dateFormat.format(day.date);
      return `<circle class="pump-point" cx="${x(index)}" cy="${y(day.pumped)}" r="${dayCount === 7 ? 3 : 2}"><title>${label} · ${day.pumped} ml pumped</title></circle><circle class="fed-point" cx="${x(index)}" cy="${y(day.fed)}" r="${dayCount === 7 ? 3 : 2}"><title>${label} · ${day.fed} ml fed</title></circle>`;
    }).join("");
    const birth = renderBirthBoundary(days, plot, x, height);
    $("#pump-line-chart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily milk pumped and milk fed in millilitres over the last ${dayCount} care days${birth.marker ? "; Cam’s birth day is marked" : ""}">${birth.background}${axis}${birth.marker}${pumpedPoints ? `<polyline class="pump-line" points="${pumpedPoints}" /><polyline class="fed-line" points="${fedPoints}" />` : ""}${points}${labels}</svg>`;
  }

  function renderPumpSessionChart() {
    const at = now();
    const dateFormat = new Intl.DateTimeFormat("en-US", { timeZone: selectedTimeZone(), day: "numeric", month: "short" });
    const series = [
      { offset: -2, color: "#6b59d3", labelColor: "#5443a8", pointPosition: 0 },
      { offset: -1, color: "#ef7467", labelColor: "#a3443a", pointPosition: .5 },
      { offset: 0, color: "#3aa88d", labelColor: "#246f61", pointPosition: 1 }
    ].map((day) => {
      const window = careWindowAtOffset(day.offset, at);
      const events = eventsInCareWindow(window, (event) => event.type === "pump", at)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      return {
        ...day,
        window,
        events,
        label: day.offset === 0 ? "Today" : `${Math.abs(day.offset)}d ago`,
        date: (() => { const date = shiftZonedDays(startOfDay(at), day.offset); return dateFormat.format(date); })(),
        opacity: day.offset === 0 ? .78 : day.offset === -1 ? .92 : .88
      };
    });
    const width = 330;
    const height = 244;
    const observedMax = Math.max(0, ...series.flatMap((day) => day.events.map((event) => pumpVolumes(event).totalMl)));
    const scaleMax = Math.max(100, Math.ceil(observedMax / 50) * 50);
    const plot = { left: Math.max(33, 9 + String(scaleMax).length * 7), right: 17, top: 50, bottom: 58 };
    const rightEdge = width - plot.right;
    const bottomEdge = height - plot.bottom;
    const plotHeight = bottomEdge - plot.top;
    const x = (hours) => plot.left + (Math.max(0, Math.min(24, hours)) / 24) * (rightEdge - plot.left);
    const y = (value) => bottomEdge - (value / scaleMax) * plotHeight;
    const axis = renderChartYAxis(plot, width, scaleMax, y, "ml");
    const { careDayStart, daytimeStart, nighttimeStart } = timeRules();
    const careStartMinutes = clockMinutes(careDayStart);
    const boundaries = [0, ...[daytimeStart, nighttimeStart].map((clock) => (clockMinutes(clock) - careStartMinutes + 1440) % 1440).filter(Boolean), 1440].sort((a, b) => a - b);
    const dayNightBackground = boundaries.slice(0, -1).map((start, index) => {
      const end = boundaries[index + 1];
      const middle = new Date(series[0].window.start.getTime() + (start + end) * 30000);
      const kind = timelineDayPart(middle);
      return `<rect class="session-chart-${kind}" x="${x(start / 60)}" y="${plot.top}" width="${x(end / 60) - x(start / 60)}" height="${plotHeight}" />`;
    }).join("");
    const hourTicks = Array.from({ length: 7 }, (_, index) => {
      const label = formatClock(careStartMinutes + index * 240, true);
      const tickX = x(index * 4);
      const anchor = index === 6 ? "end" : "middle";
      return `<text class="session-chart-date" x="${tickX}" y="${bottomEdge + 21}" text-anchor="${anchor}">${label}</text>`;
    }).join("");
    const plottedSeries = series.map((day) => {
      const points = day.events.map((event) => {
        const timestamp = new Date(event.timestamp);
        const hours = (timestamp.getTime() - day.window.start.getTime()) / 3600000;
        const { totalMl } = pumpVolumes(event);
        return { x: x(hours), y: y(totalMl), totalMl, timestamp };
      });
      const topLeft = day.offset === -2;
      const belowPlot = day.offset === 0;
      const labelX = topLeft ? plot.left : rightEdge;
      const labelY = belowPlot ? height - 9 : 13;
      const anchor = points[Math.floor((points.length - 1) * day.pointPosition)];
      let leader = "";
      if (anchor) {
        const start = `${anchor.x},${anchor.y}`;
        // Today's leader goes around the clock labels in the right gutter.
        const route = belowPlot
          ? `${start} ${rightEdge + 9},${anchor.y} ${rightEdge + 9},${labelY - 4} ${labelX + 3},${labelY - 4}`
          : `${start} ${labelX + (topLeft ? 7 : -7)},${labelY + 19}`;
        leader = `<polyline class="session-chart-leader" style="--series-color:${day.color}" points="${route}" />`;
      }
      const dots = points.map((point) => `<circle class="session-chart-point" cx="${point.x}" cy="${point.y}" r="3.3"><title>${formatTime(point.timestamp)} · ${point.totalMl} ml</title></circle>`).join("");
      const coordinates = points.map((point) => `${point.x},${point.y}`).join(" ");
      const path = points.length > 1 ? `<polyline class="session-chart-line" points="${coordinates}" />` : "";
      const line = `<g class="session-chart-series" style="--series-color:${day.color};opacity:${day.opacity}">${path}${dots}</g>`;
      const countText = `${points.length} ${points.length === 1 ? "pump" : "pumps"}`;
      const labelText = `${countText} (${day.label} - ${day.date})`;
      const content = belowPlot ? labelText : `<tspan x="${labelX}" dy="0">${countText}</tspan> <tspan x="${labelX}" dy="14">(${day.label} - ${day.date})</tspan>`;
      const label = `<text class="session-chart-count" style="--series-label-color:${day.labelColor}" x="${labelX}" y="${labelY}" text-anchor="${topLeft ? "start" : "end"}" aria-label="${labelText}">${content}</text>`;
      return { leader, line, label };
    });
    const renderLayer = (key) => plottedSeries.map((day) => day[key]).join("");
    const counts = series.map((day) => `${day.events.length} pumps (${day.label} - ${day.date})`).join(", ");
    $("#pump-session-chart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Millilitres per pump by time across three care days, with daytime starting at ${formatClock(daytimeStart)} and nighttime starting at ${formatClock(nighttimeStart)}. ${counts}">${dayNightBackground}${axis}${hourTicks}${renderLayer("leader")}${renderLayer("line")}${renderLayer("label")}</svg>`;
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
    const careDayTime = formatClock(timeRules().careDayStart);
    const dailyReportTime = formatClock(timeRules().dailyReportTime);
    const weeklyReportTime = formatClock(timeRules().weeklyReportTime);
    $("#daily-report-window-label").textContent = `Last complete care day · ${careDayTime} → ${careDayTime}`;
    const today = totalsFor(dailyReportEvents());
    const summary = [
      `${today.feeds} ${today.feeds === 1 ? "feed" : "feeds"}`,
      `${today.wet} wet ${today.wet === 1 ? "diaper" : "diapers"}`,
      `${today.dirty} dirty ${today.dirty === 1 ? "diaper" : "diapers"}`,
      `${formatDuration(today.sleepMinutes)} recorded sleep`
    ];
    if (today.baths) summary.push(`${today.baths} ${today.baths === 1 ? "bath" : "baths"}`);
    if (today.sunbathing) summary.push(`${today.sunbathing} sunbathing ${today.sunbathing === 1 ? "session" : "sessions"}`);
    if (today.tummyTime) summary.push(`${today.tummyTime} tummy time ${today.tummyTime === 1 ? "session" : "sessions"}`);
    if (today.walks) summary.push(`${today.walks} ${today.walks === 1 ? "walk" : "walks"}`);
    $("#daily-report-copy").textContent = `${summary.join(" · ")}.`;
    $("#daily-tip").textContent = dailyInsight?.suggestion || "Reviewing Cam’s care pattern for a useful suggestion…";
    $("#daily-tip-meta").textContent = dailyInsight
      ? `${dailyInsight.provider === "openai" ? "GPT suggestion" : "AI review unavailable"} · ${dailyInsight.reportDate}`
      : `Available at ${dailyReportTime} · ${formatDateTime(dailyReportWindow().nextAvailableAt)} next`;

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
    if (weekly.tummyTime) weeklySummary.push(`${weekly.tummyTime} tummy time ${weekly.tummyTime === 1 ? "session" : "sessions"}`);
    if (weekly.walks) weeklySummary.push(`${weekly.walks} ${weekly.walks === 1 ? "walk" : "walks"}`);
    const shortDate = (date) => new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), day: "numeric", month: "short" }).format(date);
    $("#weekly-window-label").textContent = `Baby week ${week.weekNumber} · ${shortDate(week.start)} → ${shortDate(week.end)}`;
    $("#weekly-report-copy").textContent = `${weeklySummary.join(" · ")}.`;
    const nextWeeklyAt = weeklyInsight?.nextAvailableAt ? new Date(weeklyInsight.nextAvailableAt) : babyWeekGenerationAt(week.weekNumber);
    const pendingSuggestion = `Cam’s weekly suggestion will be generated at ${weeklyReportTime} after baby week ${week.weekNumber} is complete.`;
    $("#weekly-tip").textContent = weeklyInsight?.suggestion || (weeklyInsight?.status === "generating" ? "Preparing Cam’s completed baby-week comparison now." : pendingSuggestion);
    $("#weekly-tip-meta").textContent = weeklyInsight?.suggestion
      ? `${weeklyInsight.provider === "openai" ? "GPT suggestion" : "AI review unavailable"} · baby week ${weeklyInsight.weekNumber}`
      : `${formatDateTime(nextWeeklyAt)} · based on Cam’s age week, not the calendar week`;
  }

  async function refreshDailyInsight() {
    if (!syncReady) return;
    try {
      const insight = await camRequest("/daily-insight");
      dailyInsight = insight?.suggestion ? insight : null;
      renderReports();
      clearTimeout(dailyInsightTimer);
      if (insight?.status === "generating") {
        dailyInsightTimer = setTimeout(refreshDailyInsight, 10_000);
        return;
      }
      if (insight?.status === "fallback") {
        dailyInsightTimer = setTimeout(refreshDailyInsight, 5 * 60_000);
        return;
      }
      const nextAt = new Date(insight?.nextAvailableAt || 0).getTime();
      const delay = nextAt - Date.now();
      if (delay > 0 && delay < 2147483647) {
        dailyInsightTimer = setTimeout(refreshDailyInsight, delay + 2000);
      }
    } catch (_) {
      $("#daily-tip").textContent = "The AI review is temporarily unavailable. Check the report again soon for a suggestion.";
      $("#daily-tip-meta").textContent = "GPT service unavailable";
      clearTimeout(dailyInsightTimer);
      dailyInsightTimer = setTimeout(refreshDailyInsight, 5 * 60_000);
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
      if (insight?.status === "fallback") {
        weeklyInsightTimer = setTimeout(refreshWeeklyInsight, 5 * 60_000);
        return;
      }
      const nextAt = new Date(insight?.nextAvailableAt || 0).getTime();
      const delay = nextAt - Date.now();
      if (delay > 0 && delay < 2147483647) {
        weeklyInsightTimer = setTimeout(refreshWeeklyInsight, delay + 2000);
      }
    } catch (_) {
      $("#weekly-tip").textContent = "The AI review is temporarily unavailable. Check the report again soon for a suggestion.";
      $("#weekly-tip-meta").textContent = "GPT service unavailable";
      clearTimeout(weeklyInsightTimer);
      weeklyInsightTimer = setTimeout(refreshWeeklyInsight, 5 * 60_000);
    }
  }

  function renderDate() {
    const label = new Intl.DateTimeFormat("en", {
      timeZone: selectedTimeZone(),
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
    $("#profile-summary").textContent = `${BABY.sex} · Born ${formatDateTime(BABY.bornAt)} · ${BABY.birthWeightKg} kg at birth`;
    const latestWeight = state.events.filter((event) => event.type === "growth" && Number(event.data?.weightKg) > 0).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
    $("#measurements-summary").textContent = latestWeight ? `Latest weight · ${Number(latestWeight.data.weightKg)} kg` : `Birth weight · ${BABY.birthWeightKg} kg`;
    $("#birth-details-row").textContent = `${formatDateTime(BABY.bornAt)} · ${BABY.sex} · ${BABY.birthWeightKg} kg`;
    $$('[data-user-avatar]').forEach((image) => {
      image.src = currentUser?.avatarUrl || "./house_cam.jpg";
    });
    $("#profile-preferences").innerHTML = preferenceEntries().map(([key, label, value]) => `<button class="setting-row preference-row" data-edit-time-rule="${key}" type="button"><span class="preference-label"><strong>${label}</strong>${preferenceEditIcon()}</span><span class="preference-value">${escapeHtml(value)}</span></button>`).join("");
  }

  function preferenceEditIcon() {
    return '<svg class="setting-edit-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16-.8 4.8L8 20l10.8-10.8a2.3 2.3 0 0 0-3.2-3.2L4.8 16.8 4 16Zm10-8 3.2 3.2" /></svg>';
  }

  function preferenceEntries() {
    const rules = timeRules();
    return [
      ["timeZone", "Time zone", rules.timeZone],
      ["careDayStart", "Care day", `${formatClock(rules.careDayStart)} → ${formatClock(rules.careDayStart)}`],
      ["daytimeStart", "Daytime begins", formatClock(rules.daytimeStart)],
      ["nighttimeStart", "Nighttime begins", formatClock(rules.nighttimeStart)],
      ["reminderAgeMonths", "Daily care reminders until", `${reminderAgeMonths()} months`],
      ["dailyReportTime", "Daily report", formatClock(rules.dailyReportTime)],
      ["weeklyReportTime", "Weekly report", `Age week · ${formatClock(rules.weeklyReportTime)}`]
    ];
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

  function vaccineRecommendedAt(dose) {
    const birth = new Date(BABY.bornAt);
    const date = new Date(Date.UTC(birth.getUTCFullYear(), birth.getUTCMonth() + dose.months, birth.getUTCDate() + (dose.days || 0), 2));
    // Cam's birth date is in Vietnam; keep the calendar age independent of care-day rules.
    return zonedClockOnKey(date.toISOString().slice(0, 10), "09:00");
  }

  const vaccinePlanId = (seriesId, order) => `${seriesId}-${order}`;
  const vaccinePlanRecord = (planId) => state.events.find((event) => event.type === "vaccine" && event.data?.planDoseId === planId);
  const isArchivedVaccine = (event) => event.type === "vaccine" && !event.data?.planDoseId && !event.data?.customSeriesId;

  function vaccineDoseRow(series, dose, order, record = null, custom = false, timeView = false) {
    const total = series.doses.length;
    const completed = record?.data?.status === "completed";
    const plannedAt = record?.data?.dueAt;
    const recommendedAt = custom ? null : vaccineRecommendedAt(dose);
    const status = completed ? `Given ${formatDateTime(record.data.administeredAt || record.timestamp)}`
      : plannedAt ? `Appointment · ${formatDateTime(plannedAt)}`
        : recommendedAt ? `Recommended · ${formatDateTime(recommendedAt)}` : "Appointment needed";
    const overdue = !completed && (plannedAt || recommendedAt) && new Date(plannedAt || recommendedAt) < now();
    const id = vaccinePlanId(series.id, order);
    const product = record?.data?.productName?.trim() || "Not recorded";
    const origin = record?.data?.originCountry?.trim() || "Not recorded";
    return `<article class="vaccine-dose ${completed ? "completed" : ""} ${timeView ? "in-timeline" : ""}" style="--series-color:var(--vaccine-${series.tone});--series-bg:var(--vaccine-${series.tone}-soft)">
      <span class="vaccine-dose-order">${order}<small>/${total}</small></span>
      <div class="vaccine-dose-info"><strong>${escapeHtml(timeView ? series.name : dose.detail || `Dose ${order}`)}</strong>${timeView && dose.detail ? `<small class="vaccine-dose-kind">${escapeHtml(dose.detail)}</small>` : ""}<small>${escapeHtml(dose.timing || "Clinic advised")}</small><span class="vaccine-status ${completed ? "completed" : overdue ? "overdue" : ""}">${escapeHtml(status)}</span><small class="vaccine-product-line">Product: ${escapeHtml(product)} · Origin: ${escapeHtml(origin)}</small>${record?.data?.note ? `<small class="vaccine-dose-note">${escapeHtml(record.data.note)}</small>` : ""}</div>
      <button class="vaccine-dose-action" type="button" ${record ? `data-vaccine-open="${escapeHtml(record.id)}"` : custom ? `data-vaccine-custom="${escapeHtml(series.id)}" data-vaccine-order="${order}"` : `data-vaccine-plan="${escapeHtml(id)}"`}>${completed ? "View" : plannedAt ? "Edit" : "Plan"}</button>
    </article>`;
  }

  function vaccineSeriesCard(series, records = [], custom = false) {
    const completed = records.filter((record) => record?.data?.status === "completed").length;
    return `<section class="vaccine-series" style="--series-color:var(--vaccine-${series.tone});--series-bg:var(--vaccine-${series.tone}-soft)">
      <div class="vaccine-series-heading"><div><strong>${escapeHtml(series.name)}</strong><small>${series.doses.length === 1 ? "One dose" : `${series.doses.length} doses · ${completed} given`}</small></div><span class="vaccine-series-progress">${completed}/${series.doses.length}</span></div>
      ${series.note ? `<p class="vaccine-series-note">${escapeHtml(series.note)}</p>` : ""}
      <div class="vaccine-dose-list">${series.doses.map((dose, index) => vaccineDoseRow(series, dose, index + 1, records[index], custom)).join("")}</div>
    </section>`;
  }

  function vaccineTimeMarkup(plan) {
    const items = plan.flatMap((series) => series.doses.map((dose, index) => ({ series, dose, order: index + 1, record: series.records[index] })))
      .map((item) => ({ ...item, at: new Date(item.record?.data?.administeredAt || item.record?.data?.dueAt || vaccineRecommendedAt(item.dose)) }))
      .sort((a, b) => a.at - b.at || a.series.name.localeCompare(b.series.name) || a.order - b.order);
    const groups = [];
    items.forEach((item) => {
      const key = zonedDateKey(item.at);
      const last = groups.at(-1);
      if (last?.key === key) last.items.push(item);
      else groups.push({ key, at: item.at, items: [item] });
    });
    const todayKey = zonedDateKey(now());
    const marker = `<div class="vaccine-today-marker"><span>Today · ${escapeHtml(babyAgeLabel())}</span></div>`;
    let inserted = false;
    const html = groups.map((group) => {
      const placeMarker = !inserted && group.key >= todayKey;
      if (placeMarker) inserted = true;
      const label = new Intl.DateTimeFormat("en", { timeZone: selectedTimeZone(), weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(group.at);
      return `${placeMarker ? marker : ""}<section class="vaccine-time-group"><div class="vaccine-time-heading"><span>${escapeHtml(label)}</span><small>${group.items.length} ${group.items.length === 1 ? "dose" : "doses"}</small></div><div class="vaccine-time-entries">${group.items.map((item) => vaccineDoseRow(item.series, item.dose, item.order, item.record, false, true)).join("")}</div></section>`;
    }).join("");
    return `<div class="vaccine-timeline">${html}${inserted ? "" : marker}</div>`;
  }

  function renderVaccine() {
    const plan = VACCINE_SERIES.map((series) => ({ ...series, records: series.doses.map((_, index) => vaccinePlanRecord(vaccinePlanId(series.id, index + 1))) }));
    const pending = plan.flatMap((series) => series.doses.map((dose, index) => ({ series, dose, index, record: series.records[index] })))
      .filter((item) => item.record?.data?.status !== "completed")
      .sort((a, b) => new Date(a.record?.data?.dueAt || vaccineRecommendedAt(a.dose)) - new Date(b.record?.data?.dueAt || vaccineRecommendedAt(b.dose)));
    const next = pending[0];
    $("#vaccine-upcoming-count").textContent = String(pending.length);
    $("#vaccine-next-name").textContent = next ? `${next.series.name} · ${next.index + 1}/${next.series.doses.length}` : "Plan complete";
    $("#vaccine-next-time").textContent = next ? next.record?.data?.dueAt ? vaccineDueStatus(next.record.data.dueAt).label : `${next.dose.timing} · confirm with clinic` : "All recommended doses recorded";
    $("#vaccine-upcoming-summary").textContent = `${pending.length} to review`;
    const view = state.vaccinePlanView === "series" ? "series" : "time";
    $$("[data-vaccine-view]").forEach((button) => { const active = button.dataset.vaccineView === view; button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active)); });
    $("#vaccine-upcoming-list").classList.toggle("is-timeline", view === "time");
    $("#vaccine-upcoming-list").innerHTML = view === "time" ? vaccineTimeMarkup(plan) : plan.map((series) => vaccineSeriesCard(series, series.records)).join("");

    const customRecords = state.events.filter((event) => event.type === "vaccine" && event.data?.customSeriesId);
    const groups = new Map();
    customRecords.forEach((record) => {
      const id = record.data.customSeriesId;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(record);
    });
    $("#vaccine-completed-summary").textContent = `${groups.size} ${groups.size === 1 ? "series" : "series"}`;
    $("#vaccine-completed-list").innerHTML = groups.size ? [...groups].map(([id, items]) => {
      const first = items[0];
      const total = Math.max(1, ...items.map((item) => Number(item.data.doseTotal) || 1));
      const series = { id, name: first.data.kind || first.title, tone: "custom", note: "Clinic plan", doses: Array.from({ length: total }, (_, index) => ({ detail: `Dose ${index + 1}`, timing: items.find((item) => Number(item.data.doseNumber) === index + 1)?.data?.spacing || "Ask clinic for timing" })) };
      const records = series.doses.map((_, index) => items.find((item) => Number(item.data.doseNumber) === index + 1));
      return vaccineSeriesCard(series, records, true);
    }).join("") : '<div class="vaccine-empty">Add any vaccines recommended by Cam’s clinic here.</div>';

    const archive = state.events.filter(isArchivedVaccine).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    $("#vaccine-archive-summary").textContent = `${archive.length} preserved`;
    $("#vaccine-archive-list").innerHTML = archive.length ? archive.map((event) => `<article class="vaccine-item archived"><button class="vaccine-item-main" data-vaccine-open="${escapeHtml(event.id)}" type="button"><span class="vaccine-item-copy"><strong>${escapeHtml(event.data?.kind || event.title)}</strong><small>${escapeHtml(event.data?.status === "completed" ? `Given ${formatDateTime(event.data?.administeredAt || event.timestamp)}` : `Planned ${formatDateTime(event.data?.dueAt || event.timestamp)}`)}</small><small>Product: ${escapeHtml(event.data?.productName || "Not recorded")} · Origin: ${escapeHtml(event.data?.originCountry || "Not recorded")}</small></span></button><span class="vaccine-archive-badge">Archived</span></article>`).join("") : '<div class="vaccine-empty">No earlier vaccine entries.</div>';
  }

  function renderSession() {
    const container = $("#active-sessions");
    const sessions = state.activeSessions || { sleep: null, feed: null, other: null };
    const cards = [];
    if (sessions.sleep) cards.push({ key: "sleep", session: sessions.sleep, label: "Shhh... Cam's sleeping!", icon: icons.sleep });
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
    lastRenderedCareStart = currentCareWindow().start.getTime();
    renderBabyDetails();
    renderDate();
    renderTimeline();
    renderLastFeed();
    renderVitaminDReminder();
    renderAfternoonCareReminder();
    renderStats();
    renderPump();
    renderReports();
    renderVaccine();
    renderSession();
  }

  function showToast(message, success = true) {
    const toast = $("#activity-toast");
    if (!toast || !message) return;
    clearTimeout(toastDismissTimer);
    toast.textContent = message;
    toast.dataset.tone = success ? "success" : "info";
    toast.classList.add("visible");
    toastDismissTimer = setTimeout(() => toast.classList.remove("visible"), 3000);
  }

  function requireParentMutation() {
    if (currentRole !== "observer") return true;
    showToast("Only parents can make changes.", false);
    $("#activity-toast").dataset.tone = "restricted";
    return false;
  }

  function commitActivities(events, message = "Activity logged", onCommit = null) {
    if (!requireParentMutation()) return;
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
        commitActivities([sleepEvent, pendingActivity.event], sleepEvent ? `${pendingActivity.message} · sleep ended` : pendingActivity.message, pendingActivity.onCommit);
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
    if (!requireParentMutation()) return;
    const event = state.events.find((item) => item.id === eventId);
    if (!event) return;
    state.events = state.events.filter((item) => item.id !== eventId);
    state.deletedEventIds = [...new Set([...(state.deletedEventIds || []), eventId])];
    saveState();
    renderAll();
    closeSheet();
    showToast(`${event.title} deleted`);
  }

  function openDeleteActivityConfirmation(eventId) {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) return;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Delete activity</p><h2 id="sheet-title">Delete ${escapeHtml(event.title)}?</h2><p class="sheet-subtitle">This removes the entry from the family record on all devices. This cannot be undone.</p></header>
      <div class="delete-warning"><span>Check this is the right activity before deleting.</span></div>
      <div class="sheet-actions two"><button class="sheet-secondary" id="cancel-delete" type="button">Keep entry</button><button class="sheet-danger" id="confirm-delete" type="button">Delete entry</button></div>
    `);
    $("#cancel-delete").addEventListener("click", closeSheet);
    $("#confirm-delete").addEventListener("click", () => deleteActivity(eventId));
  }

  function openSheet(html) {
    clearInterval(sleepPreviewTimer);
    $("#sheet-content").innerHTML = html;
    $("#sheet-backdrop").classList.add("open");
    $("#action-sheet").classList.add("open");
  }

  function closeSheet() {
    clearInterval(sleepPreviewTimer);
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
        <div class="pump-side-field pump-left"><strong>Left breast</strong><div class="pump-side-wheel"><button id="pump-left-minus" type="button" aria-label="Move 5 millilitres from left to right">−</button><span id="pump-left-value">50 ml</span><button id="pump-left-plus" type="button" aria-label="Move 5 millilitres from right to left">+</button></div></div>
        <div class="pump-side-field pump-right"><strong>Right breast</strong><div class="pump-side-wheel"><button id="pump-right-minus" type="button" aria-label="Move 5 millilitres from right to left">−</button><span id="pump-right-value">50 ml</span><button id="pump-right-plus" type="button" aria-label="Move 5 millilitres from left to right">+</button></div></div>
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
      leftMl = Math.max(0, Math.min(totalMl, leftMl + halfChange));
      rightMl = totalMl - leftMl;
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
        <span class="choice-label">Supplement</span>
        <div class="choice-grid single"><button class="choice-button" data-vitamin-d-toggle type="button" aria-pressed="false">Vitamin D included</button></div>
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
        <span class="choice-label">Supplement</span>
        <div class="choice-grid single"><button class="choice-button" data-vitamin-d-toggle type="button" aria-pressed="false">Vitamin D included</button></div>
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
    $$('[data-vitamin-d-toggle]').forEach((button) => button.addEventListener("click", () => {
      const selected = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("selected", selected);
    }));
    $("#amount-minus")?.addEventListener("click", () => { amount = Math.max(10, amount - 10); $("#bottle-amount").textContent = `${amount} ml`; });
    $("#amount-plus")?.addEventListener("click", () => { amount = Math.min(360, amount + 10); $("#bottle-amount").textContent = `${amount} ml`; });
    bindWheel("breast-duration", 15, 5, 90, 5, (value) => { breastDuration = value; $("#quick-breast").textContent = `Log ${value} min feed`; });
    bindWheel("bottle-duration", 15, 5, 90, 5, (value) => { bottleDuration = value; $("#log-bottle").textContent = `Log ${value} min feed`; });
    $("#quick-breast")?.addEventListener("click", () => {
      const side = $('[data-choice-group="side"] .selected').dataset.value;
      const vitaminD = $('[data-feed-panel="breast"] [data-vitamin-d-toggle]').getAttribute("aria-pressed") === "true";
      const note = $("#breast-note").value.trim();
      openLogTimeSheet("feed", (endedAt) => {
        const startedAt = new Date(endedAt.getTime() - breastDuration * 60000);
        addActivityWithWakeCheck(makeEvent("feed", "Breastfeed", `${side} · ${breastDuration} min${note ? ` · ${note}` : ""}`, endedAt, {
          mode: "breast",
          side,
          vitaminD,
          durationMin: breastDuration,
          note,
          startAt: startedAt.toISOString(),
          endAt: endedAt.toISOString()
        }), "Breastfeed logged", "feed");
      });
    });
    $("#start-breast")?.addEventListener("click", () => {
      if (!requireParentMutation()) return;
      const side = $('[data-choice-group="side"] .selected').dataset.value;
      const vitaminD = $('[data-feed-panel="breast"] [data-vitamin-d-toggle]').getAttribute("aria-pressed") === "true";
      if (state.activeSessions.feed) { closeSheet(); showToast("A feed timer is already running", false); return; }
      const sleepWasRunning = Boolean(state.activeSessions.sleep);
      state.activeSessions.feed = { mode: "breast", side, vitaminD, startedAt: now().toISOString() };
      saveState();
      renderSession();
      closeSheet();
      showToast(`${side} feed timer started`, false);
      if (sleepWasRunning) openWakeConfirmation("feed");
    });
    $("#log-bottle")?.addEventListener("click", () => {
      const milk = $('[data-choice-group="milk"] .selected').dataset.value;
      const vitaminD = $('[data-feed-panel="bottle"] [data-vitamin-d-toggle]').getAttribute("aria-pressed") === "true";
      const note = $("#bottle-note").value.trim();
      openLogTimeSheet("feed", (endedAt) => {
        const startedAt = new Date(endedAt.getTime() - bottleDuration * 60000);
        addActivityWithWakeCheck(makeEvent("feed", "Bottle feed", `${milk} · ${amount} ml · ${bottleDuration} min${note ? ` · ${note}` : ""}`, endedAt, {
          mode: "bottle",
          milk,
          amount,
          vitaminD,
          durationMin: bottleDuration,
          note,
          startAt: startedAt.toISOString(),
          endAt: endedAt.toISOString()
        }), "Bottle feed logged", "feed");
      });
    });
    $("#start-bottle")?.addEventListener("click", () => {
      if (!requireParentMutation()) return;
      const milk = $('[data-choice-group="milk"] .selected').dataset.value;
      const vitaminD = $('[data-feed-panel="bottle"] [data-vitamin-d-toggle]').getAttribute("aria-pressed") === "true";
      if (state.activeSessions.feed) { closeSheet(); showToast("A feed timer is already running", false); return; }
      const sleepWasRunning = Boolean(state.activeSessions.sleep);
      state.activeSessions.feed = { mode: "bottle", milk, amount, vitaminD, startedAt: now().toISOString() };
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
    const sleepRunning = Boolean(state.activeSessions.sleep);
    openSheet(`
      <header class="sheet-header sleep-sheet-header"><p class="eyebrow">Rest time</p><div class="sleep-sheet-title-row"><h2 id="sheet-title">Sleep</h2><button class="sleep-log-link" id="open-manual-sleep" type="button">Log past sleep</button></div><p class="sheet-subtitle">${sleepRunning ? "A sleep timer is running. You can still log an earlier sleep." : "Backdate the start when you could not open the app right away."}</p></header>
      <span class="choice-label">Baby fell asleep how many minutes ago?</span>
      <div class="wheel-picker"><button id="sleep-ago-minus" type="button" aria-label="Reduce minutes ago">−</button><span class="wheel-value"><small>more recent</small><strong id="sleep-ago-value">15 min</strong><em>earlier</em></span><button id="sleep-ago-plus" type="button" aria-label="Increase minutes ago">+</button></div>
      <div class="sheet-actions"><button class="sheet-primary" id="start-sleep-backdated" type="button" ${sleepRunning ? "disabled" : ""}>Start timer</button><button class="sheet-secondary" id="start-sleep" type="button" ${sleepRunning ? "disabled" : ""}>Start timer now</button></div>
    `);
    let minutesAgo = 15;
    const updateStartTime = () => {
      $("#start-sleep-backdated").textContent = `Start timer at ${formatTime(new Date(Date.now() - minutesAgo * 60000))}`;
    };
    bindWheel("sleep-ago", 15, 5, 180, 5, (value) => { minutesAgo = value; updateStartTime(); });
    sleepPreviewTimer = setInterval(updateStartTime, 15000);
    $("#open-manual-sleep").addEventListener("click", openManualSleepSheet);
    const startSleep = (backdateMinutes) => {
      if (!requireParentMutation()) return;
      if (state.activeSessions.sleep) { closeSheet(); showToast("Sleep timer is already running", false); return; }
      const startedAt = new Date(Date.now() - backdateMinutes * 60000);
      state.activeSessions.sleep = { startedAt: startedAt.toISOString() };
      saveState();
      renderSession();
      closeSheet();
      showToast(backdateMinutes ? `Sleep timer started at ${formatTime(startedAt)}` : "Sleep timer started", false);
    };
    $("#start-sleep-backdated").addEventListener("click", () => startSleep(minutesAgo));
    $("#start-sleep").addEventListener("click", () => startSleep(0));
  }

  function openManualSleepSheet() {
    const endedAt = now();
    const startedAt = new Date(endedAt.getTime() - 60 * 60000);
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Past rest</p><h2 id="sheet-title">Log a sleep</h2><p class="sheet-subtitle">Choose when Cam fell asleep and woke up, including across midnight.</p></header>
      <label class="choice-label" for="sleep-log-start">Fell asleep</label><input class="sheet-input" id="sleep-log-start" type="datetime-local" min="${toLocalDateTimeValue(BABY.bornAt)}" max="${toLocalDateTimeValue(endedAt)}" value="${toLocalDateTimeValue(startedAt)}" />
      <label class="choice-label" for="sleep-log-end">Woke up</label><input class="sheet-input" id="sleep-log-end" type="datetime-local" min="${toLocalDateTimeValue(BABY.bornAt)}" max="${toLocalDateTimeValue(endedAt)}" value="${toLocalDateTimeValue(endedAt)}" />
      <p class="sleep-log-duration" id="sleep-log-duration"></p><p class="sleep-log-error" id="sleep-log-error" role="alert" hidden></p>
      <div class="sheet-actions"><button class="sheet-primary" id="save-sleep-log" type="button">Log sleep</button></div>
    `);
    const startInput = $("#sleep-log-start");
    const endInput = $("#sleep-log-end");
    const error = $("#sleep-log-error");
    const readTimes = () => ({ start: parseDateTimeInput(startInput.value), end: parseDateTimeInput(endInput.value) });
    const renderDuration = () => {
      const { start, end } = readTimes();
      error.hidden = true;
      $("#sleep-log-duration").textContent = Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start
        ? `Sleep duration · ${formatDuration((end - start) / 60000)}`
        : "Choose a start before the wake-up time.";
    };
    startInput.addEventListener("input", renderDuration);
    endInput.addEventListener("input", renderDuration);
    $("#save-sleep-log").addEventListener("click", () => {
      const { start, end } = readTimes();
      const currentTime = now();
      let problem = "";
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) problem = "Choose both sleep times.";
      else if (start < BABY.bornAt) problem = "Sleep cannot start before Cam was born.";
      else if (end > currentTime) problem = "Wake-up time cannot be in the future.";
      else if (end <= start) problem = "Wake-up time must be after sleep began.";
      if (problem) { error.textContent = problem; error.hidden = false; return; }
      const durationMin = Math.max(1, Math.round((end - start) / 60000));
      addActivity(makeEvent("sleep", "Sleep", formatDuration(durationMin), end, {
        durationMin,
        startAt: start.toISOString(),
        endAt: end.toISOString()
      }), "Sleep logged");
    });
    renderDuration();
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
      <div class="instant-options">
        <button class="instant-option" data-other="bath" type="button">${icons.bath}<span>Bath</span></button>
        <button class="instant-option" data-other="afternoonCare" type="button">${icons.afternoonCare}<span>Afternoon care</span></button>
        <button class="instant-option" data-other="sunbathing" type="button">${icons.sunbathing}<span>Sunbathing</span></button>
        <button class="instant-option" data-other="tummyTime" type="button">${icons.tummyTime}<span>Tummy time</span></button>
        <button class="instant-option" data-other="walk" type="button">${icons.walk}<span>Take a walk</span></button>
      </div>
    `);
    $$('[data-other]').forEach((button) => button.addEventListener("click", () => openOtherActivitySheet(button.dataset.other)));
  }

  function afternoonCareChecklist(checks = []) {
    return `<span class="choice-label">Care checklist</span><div class="care-checklist">${AFTERNOON_CARE_ITEMS.map((item) => `<label class="care-check-item"><input type="checkbox" data-care-check="${item.key}" ${checks.includes(item.key) ? "checked" : ""} /><span>${item.label}</span></label>`).join("")}</div>`;
  }

  function selectedAfternoonCareChecks(root = document) {
    return $$('[data-care-check]:checked', root).map((input) => input.dataset.careCheck);
  }

  function openOtherActivitySheet(activityKey) {
    const activity = OTHER_ACTIVITIES[activityKey];
    if (!activity) return;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Other activity</p><h2 id="sheet-title">${activity.title}</h2><p class="sheet-subtitle">Log a completed activity or start timing it now.</p></header>
      <span class="choice-label">Duration</span>
      <div class="wheel-picker"><button id="other-duration-minus" type="button" aria-label="Reduce activity duration">−</button><span class="wheel-value"><small>shorter</small><strong id="other-duration-value">${activity.defaultDuration} min</strong><em>longer</em></span><button id="other-duration-plus" type="button" aria-label="Increase activity duration">+</button></div>
      ${activityKey === "afternoonCare" ? afternoonCareChecklist() : ""}
      <span class="choice-label">Optional note</span><input class="sheet-input" id="other-activity-note" maxlength="100" placeholder="Anything useful to remember" />
      <div class="sheet-actions two"><button class="sheet-primary" id="log-other-activity" type="button">Log ${activity.title.toLowerCase()}</button><button class="sheet-secondary" id="start-other-activity" type="button">Start timer</button></div>
    `);
    let durationMin = activity.defaultDuration;
    bindWheel("other-duration", activity.defaultDuration, 5, 180, 5, (value) => { durationMin = value; });
    $("#log-other-activity").addEventListener("click", () => {
      const note = $("#other-activity-note").value.trim();
      const checks = activityKey === "afternoonCare" ? selectedAfternoonCareChecks() : [];
      openLogTimeSheet(activity.title.toLowerCase(), (endedAt) => {
        const startedAt = new Date(endedAt.getTime() - durationMin * 60000);
        addActivityWithWakeCheck(makeEvent(activity.type, activity.title, `${durationMin} min${note ? ` · ${note}` : ""}`, endedAt, { durationMin, note, checks, startAt: startedAt.toISOString(), endAt: endedAt.toISOString() }), `${activity.title} logged`, activity.title.toLowerCase());
      }, { confirmNowLabel: `Log ${activity.title.toLowerCase()} now` });
    });
    $("#start-other-activity").addEventListener("click", () => {
      if (!requireParentMutation()) return;
      if (state.activeSessions?.other) { closeSheet(); showToast("An activity timer is already running", false); return; }
      const sleepWasRunning = Boolean(state.activeSessions?.sleep);
      state.activeSessions.other = { activityKey, type: activity.type, title: activity.title, note: $("#other-activity-note").value.trim(), checks: activityKey === "afternoonCare" ? selectedAfternoonCareChecks() : [], startedAt: now().toISOString() };
      saveState();
      renderSession();
      closeSheet();
      showToast(`${activity.title} timer started`, false);
      if (sleepWasRunning) openWakeConfirmation(activity.title.toLowerCase());
    });
  }

  function openOtherStopSheet() {
    const session = state.activeSessions?.other;
    if (!session) return;
    const elapsedMinutes = Math.max(1, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000));
    openLogTimeSheet(session.title.toLowerCase(), (endedAt) => stopOtherSession(endedAt, session.type === "afternoonCare" ? selectedAfternoonCareChecks() : []), {
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
    if (session.type === "afternoonCare") {
      const actions = $("#sheet-content .sheet-actions");
      actions?.insertAdjacentHTML("beforebegin", afternoonCareChecklist(session.checks || []));
    }
  }

  function stopOtherSession(requestedEndedAt = now(), checks = []) {
    const session = state.activeSessions?.other;
    if (!session) return;
    const startedAt = new Date(session.startedAt);
    const requested = new Date(requestedEndedAt);
    const endedAt = new Date(Math.min(Date.now(), Math.max(startedAt.getTime(), requested.getTime())));
    const durationMin = Math.max(1, Math.round((endedAt - startedAt) / 60000));
    addActivityWithWakeCheck(
      makeEvent(session.type, session.title, `${durationMin} min${session.note ? ` · ${session.note}` : ""}`, endedAt, { durationMin, note: session.note || "", checks, startAt: startedAt.toISOString(), endAt: endedAt.toISOString() }),
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
    if (!requireParentMutation()) return null;
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
    if (!requireParentMutation()) return;
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
        vitaminD: Boolean(session.vitaminD),
        durationMin,
        startAt: session.startedAt,
        endAt: endedAt.toISOString()
      }), "Bottle timer stopped");
    } else {
      addActivity(makeEvent("feed", "Breastfeed", `${session.side} · ${durationText}`, endedAt, {
        mode: "breast",
        side: session.side,
        vitaminD: Boolean(session.vitaminD),
        durationMin,
        startAt: session.startedAt,
        endAt: endedAt.toISOString()
      }), "Feed timer stopped");
    }
  }

  function openEditActivitySheet(eventId) {
    const event = state.events.find((item) => item.id === eventId && item.type !== "vaccine");
    if (!event) return;
    const timed = ["feed", "sleep", "bath", "afternoonCare", "sunbathing", "tummyTime", "walk", "pump"].includes(event.type);
    const durationMin = Math.max(1, Number(event.data?.durationMin || 10));
    const note = event.data?.note || "";
    const bottleFields = event.type === "feed" && event.data?.mode === "bottle" ? `
      <label class="choice-label" for="edit-feed-milk">Milk</label><select class="sheet-select" id="edit-feed-milk"><option value="Expressed milk" ${event.data?.milk === "Expressed milk" ? "selected" : ""}>Breast milk</option><option value="Formula" ${event.data?.milk === "Formula" ? "selected" : ""}>Formula</option></select>
      <label class="choice-label" for="edit-feed-amount">Amount (ml)</label><input class="sheet-input" id="edit-feed-amount" type="number" min="10" max="500" step="10" value="${Number(event.data?.amount || 90)}" />` : "";
    const breastFields = event.type === "feed" && event.data?.mode === "breast" ? `
      <label class="choice-label" for="edit-feed-side">Side</label><select class="sheet-select" id="edit-feed-side"><option ${event.data?.side === "Left" ? "selected" : ""}>Left</option><option ${event.data?.side === "Right" ? "selected" : ""}>Right</option><option ${event.data?.side === "Both" ? "selected" : ""}>Both</option></select>` : "";
    const pump = event.type === "pump" ? pumpVolumes(event) : null;
    const pumpFields = pump ? `
      <span class="choice-label">Milk pumped</span>
      <div class="pump-side-entry-grid">
        <label class="pump-side-field pump-left" for="edit-pump-left"><strong>Left breast</strong><input class="sheet-input" id="edit-pump-left" type="number" min="0" max="500" step="5" value="${pump.leftMl}" /></label>
        <label class="pump-side-field pump-right" for="edit-pump-right"><strong>Right breast</strong><input class="sheet-input" id="edit-pump-right" type="number" min="0" max="500" step="5" value="${pump.rightMl}" /></label>
      </div>` : "";
    const diaperFields = event.type === "diaper" ? `
      <label class="choice-label" for="edit-diaper-kind">Diaper</label><select class="sheet-select" id="edit-diaper-kind"><option value="wet" ${event.data?.kind === "wet" ? "selected" : ""}>Wet</option><option value="dirty" ${event.data?.kind === "dirty" ? "selected" : ""}>Dirty</option></select>` : "";
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Correct activity</p><h2 id="sheet-title">Edit ${escapeHtml(event.title)}</h2><p class="sheet-subtitle">Changes sync to the family record after you save.</p></header>
      ${bottleFields}${breastFields}${pumpFields}${diaperFields}
      <label class="choice-label" for="edit-activity-time">${timed ? "Finish time" : "Recorded time"}</label><input class="sheet-input" id="edit-activity-time" type="datetime-local" value="${toLocalDateTimeValue(event.timestamp)}" />
      ${timed ? `<label class="choice-label" for="edit-activity-duration">Duration (minutes)</label><input class="sheet-input" id="edit-activity-duration" type="number" min="1" max="1440" step="1" value="${durationMin}" />` : ""}
      ${event.type === "afternoonCare" ? afternoonCareChecklist(event.data?.checks || []) : ""}
      ${event.type === "feed" ? `<span class="choice-label">Supplement</span><div class="choice-grid single"><button class="choice-button ${event.data?.vitaminD ? "selected" : ""}" id="edit-feed-vitamin-d" type="button" aria-pressed="${event.data?.vitaminD ? "true" : "false"}">Vitamin D included</button></div>` : ""}
      <label class="choice-label" for="edit-activity-note">Optional note</label><textarea class="sheet-textarea" id="edit-activity-note" maxlength="180" placeholder="Anything useful to remember">${escapeHtml(note)}</textarea>
      <div class="sheet-actions"><button class="sheet-primary" id="save-activity-edit" type="button">Save changes</button></div>
    `);
    $("#edit-feed-vitamin-d")?.addEventListener("click", (clickEvent) => {
      const button = clickEvent.currentTarget;
      const selected = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("selected", selected);
    });
    $("#save-activity-edit").addEventListener("click", () => {
      if (!requireParentMutation()) return;
      const endedAt = parseDateTimeInput($("#edit-activity-time").value);
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
      if (event.type === "feed") event.data.vitaminD = $("#edit-feed-vitamin-d").getAttribute("aria-pressed") === "true";
      if (event.type === "afternoonCare") event.data.checks = selectedAfternoonCareChecks();
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
      showToast(`${event.title} updated`);
    });
  }

  function openActivityPattern() {
    const { daytimeStart, nighttimeStart } = timeRules();
    const dayStartMinutes = clockMinutes(daytimeStart);
    const dayLength = (clockMinutes(nighttimeStart) - dayStartMinutes + 1440) % 1440;
    const events = eventsForCareDay().filter((event) => {
      const date = new Date(event.timestamp);
      const timeParts = zonedParts(date);
      const minute = timeParts.hour * 60 + timeParts.minute;
      return (minute - dayStartMinutes + 1440) % 1440 < dayLength;
    });
    const lanes = [
      { label: "Feeds", types: ["feed"], className: "feed" },
      { label: "Diapers", types: ["diaper"], className: "diaper" },
      { label: "Sleep", types: ["sleep"], className: "sleep" },
      { label: "Other", types: ["bath", "afternoonCare", "sunbathing", "tummyTime", "walk"], className: "other" }
    ];
    const laneMarkup = lanes.map((lane) => {
      const points = events.filter((event) => lane.types.includes(event.type)).map((event) => {
        const date = new Date(event.timestamp);
        const timeParts = zonedParts(date);
      const minute = timeParts.hour * 60 + timeParts.minute;
        const left = Math.max(0, Math.min(100, ((minute - dayStartMinutes + 1440) % 1440 / dayLength) * 100));
        return `<i class="pattern-point ${lane.className}" style="left:${left}%" title="${escapeHtml(event.title)} · ${escapeHtml(formatTime(date))}"></i>`;
      }).join("");
      return `<div class="pattern-lane"><strong>${lane.label}</strong><span class="pattern-track">${points}</span></div>`;
    }).join("");
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Current care day</p><h2 id="sheet-title">Activities pattern</h2><p class="sheet-subtitle">A daytime view from ${formatClock(daytimeStart)} to ${formatClock(nighttimeStart)}. Each dot marks when an activity was recorded or finished.</p></header>
      <div class="activity-pattern"><div class="pattern-axis">${[0, 1, 2, 3].map((index) => `<span>${formatClock(dayStartMinutes + dayLength * index / 3, true)}</span>`).join("")}</div>${laneMarkup}${events.length ? "" : '<div class="pattern-empty">No daytime activities have been logged in this care day.</div>'}</div>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openEventSheet(eventId) {
    const event = state.events.find((item) => item.id === eventId);
    if (!event) return;
    const timeRange = timeRangeFor(event);
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${formatTime(event.timestamp)}</p><h2 id="sheet-title">${escapeHtml(event.title)}</h2><p class="sheet-subtitle">${escapeHtml(event.detail || "No extra details")}</p></header>
      <div class="mini-report">
        <div class="mini-report-row"><span>Recorded</span><strong>${new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(event.timestamp))}</strong></div>
        ${timeRange ? `<div class="mini-report-row"><span>From–to</span><strong>${timeRange}</strong></div>` : ""}
        <div class="mini-report-row"><span>Category</span><strong>${event.type[0].toUpperCase() + event.type.slice(1)}</strong></div>
      </div>
      <div class="sheet-actions"><button class="sheet-danger" id="delete-entry" type="button">Delete entry</button></div>
    `);
    $("#delete-entry").addEventListener("click", () => openDeleteActivityConfirmation(event.id));
  }

  function openRangeInfo() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Designed for reassurance</p><h2 id="sheet-title">How comparisons work</h2></header>
      <p class="info-copy"><strong>Broad ranges, not scores.</strong> Today’s tracks show ${BABY.shortName}’s recorded position against the broad reference range for her current age in days.</p>
      <p class="info-copy">The 7- and 30-care-day views plot each logged day as a line. The pastel-green area changes with Cam’s age, and days without that activity are left unplotted instead of being treated as zero.</p>
      <p class="info-copy"><strong>${BABY.gestationalAgeWeeks} weeks · ${BABY.ethnicity} · ${BABY.sex.toLowerCase()}.</strong> This signal reference uses Cam’s full-term history and her feeding pattern: ${BABY.feedingProfile.toLowerCase()}. Sex and ethnicity are not used as unsupported corrections to feed, diaper, or sleep ranges.</p>
      <p class="info-copy">Bottle volume is measurable for Cam’s expressed breast milk and formula feeds. Because her current weight has not been measured, the volume reference remains deliberately broad and does not claim to be a weight-based target.</p>
      <p class="info-copy">Important warning signs should use separately reviewed rules and should never wait for the next report.</p>
      <span class="feedback-pill">Educational guidance only</span>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Got it</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openNotificationPreview() {
    const totals = totalsFor(dailyReportEvents());
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Notification preview</p><h2 id="sheet-title">${BABY.shortName}’s day at a glance</h2><p class="sheet-subtitle">LittleLog · ${formatClock(timeRules().dailyReportTime)} · covers the last complete care day</p></header>
      <div class="report-tip" style="margin-top:16px"><strong>Today</strong><p>${totals.feeds} feeds · ${totals.wet} wet diapers · ${totals.dirty} dirty diapers · ${formatDuration(totals.sleepMinutes)} recorded sleep.</p></div>
      <p class="info-copy">${dailyInsight?.suggestion || "The latest completed care-day suggestion will appear here after it is prepared."}</p>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openProfileInfo(kind = "profile") {
    const content = kind === "measurements"
      ? { eyebrow: "Growth", title: "Measurements", copy: `${BABY.shortName} weighed ${BABY.birthWeightKg} kg at birth. Record weight, height, head circumference, and health notes in Statistics → Growth & health.` }
      : kind === "age"
        ? { eyebrow: "Birth details", title: BABY.fullName, copy: `${BABY.shortName} is a girl, born ${formatDateTime(BABY.bornAt)}, weighing ${BABY.birthWeightKg} kg. Her current age is ${babyAgeLabel()}.` }
        : { eyebrow: "Baby profile", title: BABY.fullName, copy: `${BABY.shortName} · Girl · Born ${formatDateTime(BABY.bornAt)} · ${BABY.birthWeightKg} kg at birth.` };
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${content.eyebrow}</p><h2 id="sheet-title">${content.title}</h2></header>
      <p class="info-copy">${content.copy}</p>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openArchivedVaccinePicker(planId) {
    const [seriesId, orderText] = planId.match(/^(.*)-(\d+)$/)?.slice(1) || [];
    const series = VACCINE_SERIES.find((item) => item.id === seriesId);
    const order = Number(orderText);
    if (!series?.doses[order - 1]) return;
    const used = new Set(state.events.filter((event) => event.type === "vaccine" && event.data?.archivedSourceId).map((event) => event.data.archivedSourceId));
    const archive = state.events.filter(isArchivedVaccine).filter((event) => !used.has(event.id));
    openSheet(`<header class="sheet-header"><p class="eyebrow">Connect an earlier entry</p><h2 id="sheet-title">${escapeHtml(series.name)} · ${order}/${series.doses.length}</h2><p class="sheet-subtitle">Choose only the entry that Cam’s clinic confirms is this dose. The original remains in the archive.</p></header><div class="vaccine-picker-list">${archive.length ? archive.map((event) => `<button type="button" data-vaccine-import="${escapeHtml(event.id)}"><strong>${escapeHtml(event.data?.kind || event.title)}</strong><small>${event.data?.status === "completed" ? "Given" : "Planned"} · ${escapeHtml(formatDateTime(event.data?.administeredAt || event.data?.dueAt || event.timestamp))}</small></button>`).join("") : '<p class="info-copy">No unused earlier entries.</p>'}</div>`);
    $$('[data-vaccine-import]').forEach((button) => button.addEventListener("click", () => {
      if (!requireParentMutation()) return;
      if (vaccinePlanRecord(planId)) { showToast("This dose already has a record", false); return; }
      const source = state.events.find((event) => event.id === button.dataset.vaccineImport && isArchivedVaccine(event));
      if (!source) return;
      const completed = source.data?.status === "completed";
      const dueAt = source.data?.dueAt || source.timestamp;
      const administeredAt = completed ? source.data?.administeredAt || source.timestamp : null;
      addActivity(makeEvent("vaccine", series.name, completed ? "Completed" : "Scheduled", administeredAt || dueAt, {
        kind: series.name, planDoseId: planId, seriesId, doseNumber: order, doseTotal: series.doses.length,
        status: completed ? "completed" : "scheduled", recommendedAt: vaccineRecommendedAt(series.doses[order - 1]).toISOString(),
        dueAt: new Date(dueAt).toISOString(), administeredAt: administeredAt ? new Date(administeredAt).toISOString() : null,
        productName: source.data?.productName || "", originCountry: source.data?.originCountry || "",
        note: source.data?.note || "", archivedSourceId: source.id
      }), "Earlier entry linked to dose");
    }));
  }

  function openVaccinePlanInfo() {
    openSheet(`<header class="sheet-header"><p class="eyebrow">About this plan</p><h2 id="sheet-title">Recommended vaccine plan</h2></header><p class="info-copy">Based on Vietnam’s 2026 routine schedule. Recommended ages are guides; confirm products, timing and catch-up with Cam’s clinic.</p><p class="info-copy">Product name and country of origin refer to the vaccine Cam actually receives. Enter them from her vaccination card or ask the clinic.</p><p class="info-copy"><a href="https://tiemchungmorong.vn/document/thong-tu-52-2025-tt-byt-ngay-31-12-2025-cua-bo-y-te-ban-hanh-danh-muc-benh-truyen-nhiem-doi-tuong-va-pham-vi-phai-su-dung-vac-xin-sinh-pham-y-te-bat-buoc" target="_blank" rel="noopener noreferrer">Ministry of Health schedule</a></p><div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>`);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openPlanDoseSheet(planId) {
    const [seriesId, orderText] = planId.match(/^(.*)-(\d+)$/)?.slice(1) || [];
    const series = VACCINE_SERIES.find((item) => item.id === seriesId);
    const order = Number(orderText);
    const dose = series?.doses[order - 1];
    if (!dose) return;
    const recommendedAt = vaccineRecommendedAt(dose);
    const existing = vaccinePlanRecord(planId);
    if (existing) { openVaccineDetails(existing.id); return; }
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Recommended dose ${order} of ${series.doses.length}</p><h2 id="sheet-title">${escapeHtml(series.name)}</h2><p class="sheet-subtitle">${escapeHtml(dose.timing)} · ${escapeHtml(formatDateTime(recommendedAt))}. Confirm the appointment with Cam’s clinic.</p></header>
      ${dose.detail ? `<p class="vaccine-plan-detail">${escapeHtml(dose.detail)}</p>` : ""}
      <label class="choice-label" for="plan-vaccine-time">Clinic appointment</label><input class="sheet-input" id="plan-vaccine-time" type="datetime-local" value="${toLocalDateTimeValue(recommendedAt)}" />
      <label class="choice-label" for="plan-vaccine-actual">Actual date and time, if given</label><input class="sheet-input" id="plan-vaccine-actual" type="datetime-local" value="${toLocalDateTimeValue(now())}" />
      <label class="choice-label" for="plan-vaccine-product">Vaccine product name</label><input class="sheet-input" id="plan-vaccine-product" maxlength="100" placeholder="Name on Cam’s vaccination card" />
      <label class="choice-label" for="plan-vaccine-origin">Country of origin</label><input class="sheet-input" id="plan-vaccine-origin" maxlength="80" placeholder="Country shown on the card" />
      <label class="choice-label" for="plan-vaccine-note">Note</label><textarea class="sheet-textarea" id="plan-vaccine-note" maxlength="240" placeholder="Clinic, product, reaction, or anything useful"></textarea>
      <div class="sheet-actions two"><button class="sheet-secondary" id="plan-vaccine-schedule" type="button">Save appointment</button><button class="sheet-primary" id="plan-vaccine-given" type="button">Record given</button></div>
    `);
    const save = (completed) => {
      if (!requireParentMutation()) return;
      const dueAt = parseDateTimeInput($("#plan-vaccine-time").value);
      const administeredAt = completed ? parseDateTimeInput($("#plan-vaccine-actual").value) : null;
      if (Number.isNaN(dueAt.getTime())) { $("#plan-vaccine-time").focus(); return; }
      if (completed && Number.isNaN(administeredAt.getTime())) { $("#plan-vaccine-actual").focus(); return; }
      if (completed && administeredAt > now()) { $("#plan-vaccine-actual").focus(); showToast("Actual dose cannot be in the future", false); return; }
      const timestamp = completed ? administeredAt : dueAt;
      addActivity(makeEvent("vaccine", series.name, completed ? "Completed" : "Scheduled", timestamp, {
        kind: series.name, planDoseId: planId, seriesId, doseNumber: order, doseTotal: series.doses.length,
        status: completed ? "completed" : "scheduled", recommendedAt: recommendedAt.toISOString(), dueAt: dueAt.toISOString(),
        administeredAt: completed ? administeredAt.toISOString() : null,
        productName: $("#plan-vaccine-product").value.trim(), originCountry: $("#plan-vaccine-origin").value.trim(),
        note: $("#plan-vaccine-note").value.trim()
      }), completed ? "Vaccine dose recorded" : "Appointment saved");
    };
    $("#plan-vaccine-schedule").addEventListener("click", () => save(false));
    $("#plan-vaccine-given").addEventListener("click", () => save(true));
  }

  function openVaccineForm(mode = "schedule", event = null, seed = null) {
    const isEdit = Boolean(event);
    const isCompleted = mode === "record" || event?.data?.status === "completed";
    const defaultPlanned = mode === "schedule" ? zonedClockOnKey(shiftDateKey(zonedDateKey(now()), 1), "09:00") : now();
    const kind = event?.data?.kind || seed?.kind || "";
    const plannedAt = event?.data?.dueAt || seed?.dueAt || event?.timestamp || defaultPlanned;
    const administeredAt = event?.data?.administeredAt || (mode === "record" ? now() : plannedAt);
    const note = event?.data?.note || "";
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${isCompleted ? "Dose record" : "Clinic plan"}</p><h2 id="sheet-title">${isEdit ? "Edit vaccine" : isCompleted ? "Record a dose" : "Add clinic series"}</h2><p class="sheet-subtitle">Use the vaccine name, dose count and timing supplied by Cam’s clinic.</p></header>
      <label class="choice-label" for="vaccine-kind-input">Vaccine</label>
      <input class="sheet-input" id="vaccine-kind-input" list="vaccine-kind-options" maxlength="100" value="${escapeHtml(kind)}" placeholder="Start typing a vaccine name" ${event?.data?.planDoseId ? "readonly" : ""} />
      <datalist id="vaccine-kind-options"><option value="Hepatitis B"></option><option value="BCG"></option><option value="DTaP / IPV / Hib"></option><option value="Pneumococcal (PCV)"></option><option value="Rotavirus"></option><option value="Influenza"></option><option value="MMR"></option></datalist>
      <div class="vaccine-count-fields"><label class="choice-label" for="vaccine-dose-number">Dose number<input class="sheet-input" id="vaccine-dose-number" type="number" min="1" max="20" value="${escapeHtml(event?.data?.doseNumber || seed?.doseNumber || 1)}" ${event?.data?.planDoseId || seed ? "readonly" : ""} /></label><label class="choice-label" for="vaccine-dose-total">Total doses<input class="sheet-input" id="vaccine-dose-total" type="number" min="1" max="20" value="${escapeHtml(event?.data?.doseTotal || seed?.doseTotal || 1)}" ${event?.data?.planDoseId || seed ? "readonly" : ""} /></label></div>
      ${!isEdit && mode === "schedule" && !seed ? '<label class="choice-label" for="vaccine-spacing-weeks">Repeat every (weeks, if clinic advised)</label><input class="sheet-input" id="vaccine-spacing-weeks" type="number" min="1" max="104" placeholder="Optional; creates later appointments" />' : ""}
      <label class="choice-label" for="vaccine-planned-at">Planned date and time</label>
      <input class="sheet-input" id="vaccine-planned-at" type="datetime-local" value="${toLocalDateTimeValue(plannedAt)}" />
      ${isCompleted ? `<label class="choice-label" for="vaccine-administered-at">Actual dose date and time</label><input class="sheet-input" id="vaccine-administered-at" type="datetime-local" value="${toLocalDateTimeValue(administeredAt)}" />` : ""}
      <label class="choice-label" for="vaccine-product">Vaccine product name</label><input class="sheet-input" id="vaccine-product" maxlength="100" value="${escapeHtml(event?.data?.productName || "")}" placeholder="Name on Cam’s vaccination card" />
      <label class="choice-label" for="vaccine-origin">Country of origin</label><input class="sheet-input" id="vaccine-origin" maxlength="80" value="${escapeHtml(event?.data?.originCountry || "")}" placeholder="Country shown on the card" />
      <label class="choice-label" for="vaccine-note">Note</label>
      <textarea class="sheet-textarea" id="vaccine-note" maxlength="240" placeholder="Clinic, product, reaction, or anything useful">${escapeHtml(note)}</textarea>
      <div class="sheet-actions"><button class="sheet-primary" id="save-vaccine" type="button">${isEdit ? "Save changes" : isCompleted ? "Save given dose" : "Add clinic plan"}</button></div>
    `);
    $("#save-vaccine").addEventListener("click", () => {
      if (!requireParentMutation()) return;
      const vaccineKind = $("#vaccine-kind-input").value.trim();
      const dueAt = parseDateTimeInput($("#vaccine-planned-at").value);
      const actualInput = $("#vaccine-administered-at");
      const actualAt = actualInput ? parseDateTimeInput(actualInput.value) : null;
      const vaccineNote = $("#vaccine-note").value.trim();
      const doseNumber = Number($("#vaccine-dose-number").value);
      const doseTotal = Number($("#vaccine-dose-total").value);
      const spacingWeeks = Number($("#vaccine-spacing-weeks")?.value || 0);
      if (!vaccineKind) { $("#vaccine-kind-input").focus(); return; }
      if (!Number.isInteger(doseNumber) || !Number.isInteger(doseTotal) || doseNumber < 1 || doseTotal < doseNumber || doseTotal > 20) { $("#vaccine-dose-total").focus(); showToast("Check dose number and total", false); return; }
      if (Number.isNaN(dueAt.getTime())) { $("#vaccine-planned-at").focus(); return; }
      if (isCompleted && (!actualAt || Number.isNaN(actualAt.getTime()))) { actualInput.focus(); return; }
      if (isCompleted && actualAt > now()) { actualInput.focus(); showToast("Actual dose cannot be in the future", false); return; }
      const timestamp = isCompleted ? actualAt : dueAt;
      const customSeriesId = event?.data?.planDoseId ? null : event?.data?.customSeriesId || seed?.customSeriesId || uid();
      if (!event && state.events.some((item) => item.type === "vaccine" && item.data?.customSeriesId === customSeriesId && Number(item.data?.doseNumber) === doseNumber)) { showToast("This dose is already recorded", false); return; }
      const data = {
        kind: vaccineKind,
        ...(customSeriesId ? { customSeriesId } : {}), doseNumber, doseTotal,
        status: isCompleted ? "completed" : "scheduled",
        dueAt: dueAt.toISOString(),
        administeredAt: isCompleted ? actualAt.toISOString() : null,
        productName: $("#vaccine-product").value.trim(),
        originCountry: $("#vaccine-origin").value.trim(),
        note: vaccineNote
      };
      if (event) {
        event.title = vaccineKind;
        event.detail = isCompleted ? "Completed" : "Scheduled";
        event.timestamp = timestamp.toISOString();
        event.data = { ...event.data, ...data };
        saveState();
        renderAll();
        closeSheet();
        showToast("Vaccine updated");
      } else {
        const first = makeEvent("vaccine", vaccineKind, isCompleted ? "Completed" : "Scheduled", timestamp, data);
        const extra = mode === "schedule" && spacingWeeks > 0 ? Array.from({ length: doseTotal - doseNumber }, (_, index) => {
          const nextAt = new Date(dueAt.getTime() + (index + 1) * spacingWeeks * WEEK_MS);
          return makeEvent("vaccine", vaccineKind, "Scheduled", nextAt, { ...data, doseNumber: doseNumber + index + 1, dueAt: nextAt.toISOString(), administeredAt: null, spacing: `${spacingWeeks} weeks after previous dose` });
        }) : [];
        commitActivities([first, ...extra], isCompleted ? "Vaccine dose recorded" : "Clinic plan saved");
      }
    });
  }

  function openCompleteVaccineSheet(eventId) {
    const event = state.events.find((item) => item.id === eventId && item.type === "vaccine");
    if (!event) return;
    const dueAt = event.data?.dueAt || event.timestamp;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Mark as given</p><h2 id="sheet-title">${escapeHtml(event.data?.kind || event.title)}</h2><p class="sheet-subtitle">Planned for ${escapeHtml(formatDateTime(dueAt))}. Save when the dose was actually given.</p></header>
      <label class="choice-label" for="completed-vaccine-time">Actual dose date and time</label><input class="sheet-input" id="completed-vaccine-time" type="datetime-local" value="${toLocalDateTimeValue(now())}" />
      <label class="choice-label" for="completed-vaccine-product">Vaccine product name</label><input class="sheet-input" id="completed-vaccine-product" maxlength="100" value="${escapeHtml(event.data?.productName || "")}" placeholder="Name on Cam’s vaccination card" />
      <label class="choice-label" for="completed-vaccine-origin">Country of origin</label><input class="sheet-input" id="completed-vaccine-origin" maxlength="80" value="${escapeHtml(event.data?.originCountry || "")}" placeholder="Country shown on the card" />
      <label class="choice-label" for="completed-vaccine-note">Note</label><textarea class="sheet-textarea" id="completed-vaccine-note" maxlength="240" placeholder="Clinic, dose, reaction, or anything useful">${escapeHtml(event.data?.note || "")}</textarea>
      <div class="sheet-actions"><button class="sheet-primary" id="confirm-vaccine-complete" type="button">Mark vaccine done</button></div>
    `);
    $("#confirm-vaccine-complete").addEventListener("click", () => {
      if (!requireParentMutation()) return;
      const administeredAt = parseDateTimeInput($("#completed-vaccine-time").value);
      if (Number.isNaN(administeredAt.getTime())) { $("#completed-vaccine-time").focus(); return; }
      if (administeredAt > now()) { $("#completed-vaccine-time").focus(); showToast("Actual dose cannot be in the future", false); return; }
      event.timestamp = administeredAt.toISOString();
      event.detail = "Completed";
      event.data = { ...event.data, status: "completed", dueAt: new Date(dueAt).toISOString(), administeredAt: administeredAt.toISOString(), productName: $("#completed-vaccine-product").value.trim(), originCountry: $("#completed-vaccine-origin").value.trim(), note: $("#completed-vaccine-note").value.trim() };
      saveState();
      renderAll();
      closeSheet();
      showToast("Vaccine marked done");
    });
  }

  function openVaccineDetails(eventId) {
    const event = state.events.find((item) => item.id === eventId && item.type === "vaccine");
    if (!event) return;
    const productRows = `<div><span>Product</span><strong>${escapeHtml(event.data?.productName || "Not recorded")}</strong></div><div><span>Origin</span><strong>${escapeHtml(event.data?.originCountry || "Not recorded")}</strong></div>`;
    if (isArchivedVaccine(event)) {
      const completed = event.data?.status === "completed";
      openSheet(`<header class="sheet-header"><p class="eyebrow">Archived vaccine entry</p><h2 id="sheet-title">${escapeHtml(event.data?.kind || event.title)}</h2><p class="sheet-subtitle">Preserved from the earlier tracker. Confirm with the clinic which recommended dose this covers.</p></header><div class="vaccine-detail-grid"><div><span>Planned</span><strong>${escapeHtml(formatDateTime(event.data?.dueAt || event.timestamp))}</strong></div>${completed ? `<div><span>Given</span><strong>${escapeHtml(formatDateTime(event.data?.administeredAt || event.timestamp))}</strong></div>` : ""}${productRows}<div><span>Note</span><strong>${escapeHtml(event.data?.note || "None")}</strong></div></div><div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>`);
      $('[data-close-sheet]').addEventListener("click", closeSheet);
      return;
    }
    const completed = event.data?.status === "completed";
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">${completed ? "Given dose" : "Scheduled dose"}${event.data?.doseNumber ? ` · ${event.data.doseNumber} of ${event.data.doseTotal}` : ""}</p><h2 id="sheet-title">${escapeHtml(event.data?.kind || event.title)}</h2><p class="sheet-subtitle">${escapeHtml(event.data?.note || "No note added")}</p></header>
      <div class="vaccine-detail-grid"><div><span>Planned</span><strong>${escapeHtml(formatDateTime(event.data?.dueAt || event.timestamp))}</strong></div>${completed ? `<div><span>Actually taken</span><strong>${escapeHtml(formatDateTime(event.data?.administeredAt || event.timestamp))}</strong></div>` : ""}${productRows}<div><span>Status</span><strong>${completed ? "Completed" : vaccineDueStatus(event.data?.dueAt || event.timestamp).label}</strong></div></div>
      <div class="sheet-actions two"><button class="sheet-secondary" id="edit-vaccine-record" type="button">Edit</button>${completed ? '<button class="sheet-primary" data-close-sheet type="button">Done</button>' : '<button class="sheet-primary" id="complete-vaccine-record" type="button">Mark done</button>'}</div>
      <div class="sheet-actions"><button class="sheet-danger" id="delete-vaccine-record" type="button">Delete vaccine record</button></div>
    `);
    $('[data-close-sheet]')?.addEventListener("click", closeSheet);
    $("#edit-vaccine-record").addEventListener("click", () => openVaccineForm("edit", event));
    $("#complete-vaccine-record")?.addEventListener("click", () => openCompleteVaccineSheet(event.id));
    $("#delete-vaccine-record").addEventListener("click", () => openDeleteActivityConfirmation(event.id));
  }

  function openSettings() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Settings</p><h2 id="sheet-title">Preferences</h2></header>
      <div class="mini-report">
        ${preferenceEntries().map(([key, label, value]) => `<div class="mini-report-row time-setting-row"><span class="time-setting-label"><span>${label}</span><button data-edit-time-rule="${key}" type="button" aria-label="Edit ${label.toLowerCase()}">${preferenceEditIcon()}</button></span><strong>${escapeHtml(value)}</strong></div>`).join("")}
      </div>
      <div class="sheet-actions two"><button class="sheet-secondary" id="sign-out-littlelog" type="button">Sign out</button><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
    $$('#sheet-content [data-edit-time-rule]').forEach((button) => button.addEventListener("click", () => openTimePreferenceSheet(button.dataset.editTimeRule)));
    $("#sign-out-littlelog").addEventListener("click", signOutLittleLog);
  }

  function openGrowthForm(record = null, kind = "growth") {
    const type = record?.type || kind;
    const measurement = type === "growth";
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Growth & health</p><h2 id="sheet-title">${record ? "Edit" : "Add"} ${measurement ? "measurement" : "health note"}</h2></header>
      ${record ? "" : '<label class="choice-label" for="growth-record-type">Record type</label><select class="sheet-select" id="growth-record-type"><option value="growth" ' + (measurement ? "selected" : "") + '>Measurement</option><option value="sick" ' + (!measurement ? "selected" : "") + '>Sickness / health note</option></select>'}
      <label class="choice-label" for="growth-record-time">Date and time</label><input class="sheet-input" id="growth-record-time" type="datetime-local" value="${toLocalDateTimeValue(record?.timestamp || now())}" required />
      ${measurement ? `<div class="growth-form-grid"><label>Weight (kg)<input class="sheet-input" id="growth-weight" type="number" min="0.5" max="30" step="0.01" value="${escapeHtml(record?.data?.weightKg ?? "")}" placeholder="e.g. 3.45" /></label><label>Height (cm)<input class="sheet-input" id="growth-height" type="number" min="20" max="120" step="0.1" value="${escapeHtml(record?.data?.heightCm ?? "")}" placeholder="e.g. 51" /></label><label>Head circumference (cm)<input class="sheet-input" id="growth-head" type="number" min="20" max="70" step="0.1" value="${escapeHtml(record?.data?.headCm ?? "")}" placeholder="Optional" /></label></div>` : `<label class="choice-label" for="growth-symptoms">What happened?</label><textarea class="sheet-textarea" id="growth-symptoms" maxlength="240" placeholder="Symptoms or observation" required>${escapeHtml(record?.data?.symptoms || "")}</textarea><label class="choice-label" for="growth-temperature">Temperature (°C, optional)</label><input class="sheet-input" id="growth-temperature" type="number" min="30" max="43" step="0.1" value="${escapeHtml(record?.data?.temperatureC ?? "")}" />`}
      <label class="choice-label" for="growth-note">Note (optional)</label><textarea class="sheet-textarea" id="growth-note" maxlength="240" placeholder="Anything useful to remember">${escapeHtml(record?.data?.note || "")}</textarea>
      <p class="time-rule-error" id="growth-error" role="alert" hidden></p>
      <div class="sheet-actions"><button class="sheet-primary" id="save-growth-record" type="button">${record ? "Save changes" : "Save record"}</button></div>
      ${record ? '<div class="sheet-actions"><button class="sheet-danger" id="delete-growth-record" type="button">Delete record</button></div>' : ""}
    `);
    $("#growth-record-type")?.addEventListener("change", (event) => openGrowthForm(null, event.target.value));
    $("#delete-growth-record")?.addEventListener("click", () => openDeleteActivityConfirmation(record.id));
    $("#save-growth-record").addEventListener("click", () => {
      if (!requireParentMutation()) return;
      const timestamp = parseDateTimeInput($("#growth-record-time").value);
      const error = $("#growth-error");
      if (Number.isNaN(timestamp.getTime()) || timestamp > now()) { error.textContent = "Choose a valid time that has passed."; error.hidden = false; return; }
      const note = $("#growth-note").value.trim();
      let title, detail, data;
      if (measurement) {
        const weightKg = Number($("#growth-weight").value || 0), heightCm = Number($("#growth-height").value || 0), headCm = Number($("#growth-head").value || 0);
        if ((!weightKg && !heightCm && !headCm) || weightKg < 0 || heightCm < 0 || headCm < 0) { error.textContent = "Enter at least one measurement."; error.hidden = false; return; }
        if ((weightKg && (weightKg < .5 || weightKg > 30)) || (heightCm && (heightCm < 20 || heightCm > 120)) || (headCm && (headCm < 20 || headCm > 70))) { error.textContent = "Check the measurement values."; error.hidden = false; return; }
        title = "Growth measurement";
        detail = [weightKg && `${weightKg} kg`, heightCm && `${heightCm} cm`, headCm && `Head ${headCm} cm`, note].filter(Boolean).join(" · ");
        data = { weightKg: weightKg || null, heightCm: heightCm || null, headCm: headCm || null, note };
      } else {
        const symptoms = $("#growth-symptoms").value.trim();
        const temperatureC = Number($("#growth-temperature").value || 0);
        if (!symptoms || (temperatureC && (temperatureC < 30 || temperatureC > 43))) { error.textContent = "Add an observation and check the temperature."; error.hidden = false; return; }
        title = "Health note";
        detail = [symptoms, temperatureC && `${temperatureC} °C`, note].filter(Boolean).join(" · ");
        data = { symptoms, temperatureC: temperatureC || null, note };
      }
      if (record) Object.assign(record, { title, detail, timestamp: timestamp.toISOString(), data });
      else state.events.push(makeEvent(type, title, detail, timestamp, data));
      saveState(); renderAll(); closeSheet(); showToast(`${measurement ? "Measurement" : "Health note"} ${record ? "updated" : "saved"}`);
    });
  }

  function openTimePreferenceSheet(key) {
    const choices = {
      timeZone: { title: "Time zone", detail: "Use the same time zone for care days, timelines, charts, and reports." },
      careDayStart: { title: "Care day", detail: "A care day starts at this time and ends at the same time tomorrow." },
      daytimeStart: { title: "Daytime begins", detail: "Daytime lasts from this time until nighttime begins." },
      nighttimeStart: { title: "Nighttime begins", detail: "Nighttime lasts from this time until daytime begins." },
      reminderAgeMonths: { title: "Daily care reminders", detail: "Show Vitamin D and afternoon care reminders while Cam is younger than this age." },
      dailyReportTime: { title: "Daily report", detail: "The daily review becomes available at this local time, after its care day ends." },
      weeklyReportTime: { title: "Weekly report", detail: "The baby-week review becomes available at this local time, after that week ends." }
    };
    const choice = choices[key];
    if (!choice) return;
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Preferences</p><h2 id="sheet-title">${choice.title}</h2><p class="sheet-subtitle">${choice.detail}</p></header>
      <label class="choice-label" for="time-rule-input">${key === "timeZone" ? "IANA time zone" : key === "reminderAgeMonths" ? "Age in months" : "Time"}</label><input class="sheet-input" id="time-rule-input" type="${key === "timeZone" ? "text" : key === "reminderAgeMonths" ? "number" : "time"}" value="${escapeHtml(key === "reminderAgeMonths" ? reminderAgeMonths() : timeRules()[key])}" ${key === "timeZone" ? 'list="cam-time-zone-options" autocomplete="off"' : key === "reminderAgeMonths" ? 'min="1" max="24" step="1"' : ""} required />
      ${key === "timeZone" ? '<datalist id="cam-time-zone-options"><option value="Asia/Ho_Chi_Minh"><option value="Asia/Bangkok"><option value="Asia/Singapore"><option value="Asia/Tokyo"><option value="Europe/London"><option value="America/New_York"><option value="America/Los_Angeles"><option value="Australia/Sydney"></datalist>' : ""}
      <p class="time-rule-error" id="time-rule-error" role="alert" hidden></p>
      <div class="sheet-actions two"><button class="sheet-secondary" id="cancel-time-rule" type="button">Cancel</button><button class="sheet-primary" id="save-time-rule" type="button">Save</button></div>
    `);
    $("#cancel-time-rule").addEventListener("click", closeSheet);
    $("#save-time-rule").addEventListener("click", () => {
      if (!requireParentMutation()) return;
      const rawValue = $("#time-rule-input").value;
      const value = key === "reminderAgeMonths" ? Number(rawValue) : rawValue;
      const nextRules = { ...timeRules(), ...(key === "reminderAgeMonths" ? {} : { [key]: value }) };
      const error = $("#time-rule-error");
      let validTimeZone = true;
      if (key === "timeZone") {
        try { new Intl.DateTimeFormat("en", { timeZone: value }); } catch { validTimeZone = false; }
      }
      if (key === "timeZone" && !validTimeZone) {
        error.textContent = "Choose a valid IANA time zone.";
      } else if (key === "reminderAgeMonths" && (!rawValue || !Number.isInteger(value) || value < 1 || value > 24)) {
        error.textContent = "Choose an age from 1 to 24 months.";
      } else if (key !== "timeZone" && key !== "reminderAgeMonths" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
        error.textContent = "Choose a valid time.";
      } else if (nextRules.daytimeStart === nextRules.nighttimeStart) {
        error.textContent = "Daytime and nighttime must begin at different times.";
      } else {
        error.hidden = true;
        if (state.settings[key] === value) { closeSheet(); return; }
        state.settings[key] = value;
        state.settings.timeRulesUpdatedAt = new Date(Math.max(Date.now(), (Date.parse(state.settings.timeRulesUpdatedAt || "") || 0) + 1)).toISOString();
        dailyInsight = null;
        weeklyInsight = null;
        clearTimeout(dailyInsightTimer);
        clearTimeout(weeklyInsightTimer);
        saveState();
        renderAll();
        closeSheet();
        showToast(`${choice.title} updated`);
        syncChain.then(() => {
          if ($("#sync-status-badge")?.dataset.syncState === "synced") {
            refreshDailyInsight();
            refreshWeeklyInsight();
          }
        });
        return;
      }
      error.hidden = false;
      $("#time-rule-input").focus();
    });
  }

  function clearHistory() {
    if (!requireParentMutation()) return;
    const careEvents = state.events.filter((event) => event.type !== "vaccine");
    state.deletedEventIds = [...new Set([...(state.deletedEventIds || []), ...careEvents.map((event) => event.id)])];
    state.events = state.events.filter((event) => event.type === "vaccine");
    saveState();
    renderAll();
    closeSheet();
    showToast("Activity history cleared");
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
    $$(".view").forEach((view) => view.classList.toggle("active", view.dataset.view === viewName));
    $$('[data-nav]').forEach((button) => button.classList.toggle("active", button.dataset.nav === viewName));
    if (viewName === "stats") {
      state.statsPeriod = "today";
      $$('[data-period]').forEach((button) => button.classList.toggle("active", button.dataset.period === "today"));
      persistLocalState();
      renderStats();
    }
    const view = $(`[data-view="${viewName}"]`);
    if (view) view.scrollTop = 0;
    closeSheet();
  }

  function bindGlobalEvents() {
    document.addEventListener("click", (event) => {
      if (currentRole !== "observer") return;
      const writeControl = event.target.closest('[data-stop-session="feed"], #save-pump, #start-breast, #start-bottle, #start-sleep-backdated, #start-sleep, #start-other-activity, #confirm-log-time, #save-sleep-log, #save-note, #save-activity-edit, #save-vaccine, #confirm-vaccine-complete, #save-growth-record, #save-time-rule, #confirm-clear, #confirm-delete, #wake-yes');
      if (writeControl) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requireParentMutation();
      }
    }, true);
    $$('[data-nav]').forEach((button) => button.addEventListener("click", () => navigate(button.dataset.nav)));
    $$('[data-action]').forEach((button) => button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "feed") openFeedSheet();
      if (action === "diaper") openDiaperSheet();
      if (action === "sleep") openSleepSheet();
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
    $("#profile-preferences").addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-time-rule]");
      if (button) openTimePreferenceSheet(button.dataset.editTimeRule);
    });
    $$('[data-period]').forEach((button) => button.addEventListener("click", () => {
      state.statsPeriod = button.dataset.period;
      $$('[data-period]').forEach((item) => item.classList.toggle("active", item === button));
      saveState();
      renderStats();
    }));
    $('[data-open="range-info"]').addEventListener("click", openRangeInfo);
    $("#log-growth").addEventListener("click", () => openGrowthForm());
    $$('[data-growth-period]').forEach((button) => button.addEventListener("click", () => {
      state.growthPeriod = button.dataset.growthPeriod;
      persistLocalState();
      renderGrowth();
    }));
    $("#growth-health-list").addEventListener("click", (event) => {
      const button = event.target.closest("[data-growth-edit]");
      if (!button) return;
      const record = state.events.find((item) => item.id === button.dataset.growthEdit);
      if (record) openGrowthForm(record);
    });
    $("#schedule-vaccine").addEventListener("click", () => openVaccineForm("schedule"));
    $("#record-vaccine").addEventListener("click", () => openVaccineForm("record"));
    $("#vaccine-plan-info").addEventListener("click", openVaccinePlanInfo);
    $$("[data-vaccine-view]").forEach((button) => button.addEventListener("click", () => {
      state.vaccinePlanView = button.dataset.vaccineView === "series" ? "series" : "time";
      persistLocalState();
      renderVaccine();
    }));
    $("#view-vaccine").addEventListener("click", (event) => {
      const planned = event.target.closest("[data-vaccine-plan]");
      if (planned) { openPlanDoseSheet(planned.dataset.vaccinePlan); return; }
      const custom = event.target.closest("[data-vaccine-custom]");
      if (custom) {
        const previous = state.events.find((item) => item.type === "vaccine" && item.data?.customSeriesId === custom.dataset.vaccineCustom);
        if (previous) openVaccineForm("schedule", null, { kind: previous.data.kind || previous.title, customSeriesId: custom.dataset.vaccineCustom, doseNumber: Number(custom.dataset.vaccineOrder), doseTotal: Number(previous.data.doseTotal) || 1 });
        return;
      }
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
    if (statusTime) statusTime.textContent = formatTime(now());
  }

  function setGateStatus(message, isError = false) {
    const status = $("#sync-gate-status");
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function blockNonPhoneObserver() {
    if (!document.documentElement.classList.contains("non-phone-device")) return false;
    currentRole = "observer";
    syncReady = false;
    document.body.classList.add("observer-device-blocked");
    $("#phone-only-switch-access").focus();
    return true;
  }

  async function openSyncedApp(user, role = "parent") {
    setGateStatus("Loading Cam’s care records…");
    currentUser = user;
    currentRole = role;
    activeStorageKey = role === "observer" ? null : `${STORAGE_KEY_PREFIX}-${user.id}-v1`;
    state = activeStorageKey ? loadState(activeStorageKey, user.username === "traph") : seedState();
    const serverState = await camRequest("/state");
    mergeServerState(serverState, role !== "observer");
    syncReady = true;
    document.body.classList.toggle("observer-mode", role === "observer");
    renderAll();
    updateStatusTime();
    $("#app-stage").classList.remove("is-locked");
    $("#app-stage").setAttribute("aria-hidden", "false");
    $("#sync-gate").classList.add("is-hidden");
    setSyncStatus("synced", role === "observer" ? "Viewing family records" : "Secure Railway sync");
    if (role !== "observer") syncSnapshot();
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
        if (session.role === "observer" && blockNonPhoneObserver()) return;
        await openSyncedApp(session.user, session.role);
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
      if (session.role === "observer" && blockNonPhoneObserver()) return;
      if (session.role === "observer") await showObserverWelcome();
      await openSyncedApp(session.user, session.role);
    } catch (error) {
      setGateStatus(error.message || "LittleLog could not sign in.", true);
      $("#sync-password").select();
    } finally {
      submit.disabled = false;
    }
  }

  function showObserverWelcome() {
    return new Promise((resolve) => {
      const card = $(".sync-gate-card");
      const original = [...card.childNodes];
      const welcome = document.createElement("div");
      welcome.innerHTML = '<div class="observer-welcome-icon" aria-hidden="true">✦</div><h1 id="sync-gate-title">Welcome to Cam’s pooping world</h1><p class="sync-gate-copy">You’re here as a family observer. Explore the app as you like; only her parents can save changes.</p><button class="observer-welcome-ok" id="observer-welcome-ok" type="button">OK, let me see</button>';
      card.replaceChildren(welcome);
      $("#observer-welcome-ok").addEventListener("click", () => { card.replaceChildren(...original); resolve(); }, { once: true });
    });
  }

  bindGlobalEvents();
  window.addEventListener("resize", layoutComparisonPins);
  $("#sync-access-form").addEventListener("submit", submitLogin);
  $("#phone-only-switch-access").addEventListener("click", signOutLittleLog);
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
    if (currentCareWindow().start.getTime() !== lastRenderedCareStart) {
      renderAll();
      refreshDailyInsight();
      refreshWeeklyInsight();
      return;
    }
    renderLastFeed();
    renderVitaminDReminder();
    renderAfternoonCareReminder();
    if (state.activeSessions?.sleep) renderCharts();
  }, 30000);
  setInterval(refreshFromServer, 45000);
})();
