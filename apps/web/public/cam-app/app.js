(() => {
  "use strict";

  const STORAGE_KEY_PREFIX = "littlelog-cam-user";
  const LEGACY_STORAGE_KEYS = ["littlelog-cam-v2", "littlelog-cam-v1"];
  const CAM_API = "/api/cam";
  const BABY = {
    shortName: "Cam",
    fullName: "Phan Hoa Trà",
    sex: "Girl",
    bornAt: new Date("2026-11-18T08:00:00+07:00"),
    birthWeightKg: 3.4
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
    drop: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" /></svg>',
    dirty: '<svg viewBox="0 0 24 24"><path d="M8 18c-2 0-3.5-1.3-3.5-3S6 12 8 12c-.5-2.6 1-5 4-5 2.8 0 4.3 2.3 3.9 4.6 2.2 0 3.6 1.3 3.6 3.2 0 1.8-1.5 3.2-3.7 3.2H8Zm3.8-11c-.2-2 1.1-3.4 3.2-3" /></svg>',
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
    const days = Math.max(0, Math.floor((Date.now() - BABY.bornAt.getTime()) / 86400000));
    if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
    if (days < 60) return `${Math.floor(days / 7)} weeks`;
    const months = Math.floor(days / 30.4375);
    return `${months} month${months === 1 ? "" : "s"}`;
  };

  function makeEvent(type, title, detail, timestamp, data = {}) {
    return { id: uid(), type, title, detail, timestamp: new Date(timestamp).toISOString(), data };
  }

  function seedState() {
    return {
      events: [],
      activeSessions: {
        sleep: null,
        feed: null
      },
      settings: { dailyReport: true, weeklyReport: true },
      statsPeriod: "week",
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
        saved.activeSessions ||= { sleep: null, feed: null };
        saved.settings ||= { dailyReport: true, weeklyReport: true };
        saved.statsPeriod ||= "week";
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
      state.activeSessions = serverState.activeSessions || { sleep: null, feed: null };
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
    const cutoff = startOfDay();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    return state.events.filter((event) => new Date(event.timestamp) >= cutoff);
  }

  function eventsForToday() {
    return state.events.filter((event) => isSameDay(event.timestamp, now()));
  }

  function dailyReportEvents() {
    const windowEnd = startOfDay();
    windowEnd.setHours(20, 0, 0, 0);
    const windowStart = new Date(windowEnd);
    windowStart.setDate(windowStart.getDate() - 1);
    return state.events.filter((event) => {
      const recordedAt = new Date(event.timestamp);
      return recordedAt >= windowStart && recordedAt < windowEnd;
    });
  }

  function iconFor(type) {
    return icons[type] || icons.note;
  }

  function timeRangeFor(event) {
    if (event.type !== "feed" && event.type !== "sleep" && event.type !== "bath") return "";
    const durationMin = Number(event.data?.durationMin || 0);
    const end = new Date(event.data?.endAt || event.timestamp);
    const start = event.data?.startAt
      ? new Date(event.data.startAt)
      : new Date(end.getTime() - durationMin * 60000);
    if (!durationMin || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
    return `${formatTime(start)}–${formatTime(end)}`;
  }

  function renderTimeline() {
    const timeline = $("#timeline");
    const events = eventsForToday().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    timeline.replaceChildren();
    if (!events.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "Nothing logged yet. Tap an action above to begin.";
      timeline.appendChild(empty);
      return;
    }

    events.forEach((event) => {
      const button = document.createElement("button");
      button.className = "timeline-item";
      button.type = "button";
      button.dataset.eventId = event.id;

      const icon = document.createElement("span");
      const isDirty = event.type === "diaper" && event.data?.kind === "dirty";
      icon.className = `timeline-icon ${event.type}${isDirty ? " dirty" : ""}`;
      icon.innerHTML = isDirty ? icons.dirty : iconFor(event.type);

      const copy = document.createElement("span");
      copy.className = "timeline-copy";
      const title = document.createElement("strong");
      title.textContent = event.title;
      const detail = document.createElement("small");
      const timeRange = timeRangeFor(event);
      detail.textContent = [event.detail || "No extra details", timeRange].filter(Boolean).join(" · ");
      copy.append(title, detail);

      const time = document.createElement("span");
      time.className = "timeline-time";
      time.textContent = formatTime(event.timestamp);
      button.append(icon, copy, time);
      timeline.appendChild(button);
    });
  }

  function totalsFor(events) {
    const feeds = events.filter((event) => event.type === "feed");
    const diapers = events.filter((event) => event.type === "diaper");
    const sleep = events.filter((event) => event.type === "sleep");
    const bottles = feeds.filter((event) => event.data?.mode === "bottle");
    return {
      feeds: feeds.length,
      bottles: bottles.reduce((sum, event) => sum + Number(event.data?.amount || 0), 0),
      breastMilk: bottles.filter((event) => event.data?.milk === "Expressed milk").reduce((sum, event) => sum + Number(event.data?.amount || 0), 0),
      formula: bottles.filter((event) => event.data?.milk === "Formula").reduce((sum, event) => sum + Number(event.data?.amount || 0), 0),
      wet: diapers.filter((event) => event.data?.kind === "wet").length,
      dirty: diapers.filter((event) => event.data?.kind === "dirty").length,
      diapers: diapers.length,
      sleepMinutes: sleep.reduce((sum, event) => sum + Number(event.data?.durationMin || 0), 0)
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

  function statsWindow() {
    if (state.statsPeriod === "today") return { events: eventsForToday(), days: 1, label: "today" };
    if (state.statsPeriod === "month") return { events: eventsSince(30), days: 30, label: "30 days" };
    return { events: eventsSince(7), days: 7, label: "7 days" };
  }

  function renderStats() {
    const { events, days } = statsWindow();
    const totals = totalsFor(events);
    const grid = $("#stats-grid");
    const dailyFeeds = totals.feeds / days;
    const dailyDiapers = totals.diapers / days;
    const dailyWet = totals.wet / days;
    const dailyDirty = totals.dirty / days;
    const dailySleep = totals.sleepMinutes / days;
    const dailyBottleMilk = (totals.breastMilk + totals.formula) / days;
    const periodSuffix = days === 1 ? "today" : "per day";
    grid.innerHTML = `
      <article class="stat-card">
        <div class="stat-card-top"><span class="stat-card-icon feed">${iconFor("feed")}</span><span class="delta">Steady</span></div>
        <strong>${days === 1 ? totals.feeds : dailyFeeds.toFixed(1)}</strong><small>feeds ${periodSuffix}</small>
      </article>
      <article class="stat-card volume-card">
        <div class="stat-card-top"><span class="stat-card-icon bottle">${iconFor("feed")}</span><span class="delta">Mixed feeding</span></div>
        <div class="volume-split"><span><strong>${Math.round(totals.breastMilk / days)} ml</strong><small>breast milk</small></span><span><strong>${Math.round(totals.formula / days)} ml</strong><small>formula</small></span></div>
        <small>bottle volume ${periodSuffix}</small>
      </article>
      <article class="stat-card">
        <div class="stat-card-top"><span class="stat-card-icon diaper">${iconFor("diaper")}</span><span class="delta">${dailyWet.toFixed(1)} wet · ${dailyDirty.toFixed(1)} dirty</span></div>
        <strong>${days === 1 ? totals.diapers : dailyDiapers.toFixed(1)}</strong><small>diapers ${periodSuffix}</small>
      </article>
      <article class="stat-card">
        <div class="stat-card-top"><span class="stat-card-icon sleep">${iconFor("sleep")}</span><span class="delta">Including naps</span></div>
        <strong>${formatDuration(dailySleep)}</strong><small>sleep ${periodSuffix}</small>
      </article>
    `;

    $("#range-insight").textContent = `The middle mark is a broad age-based average. ${BABY.shortName}’s point shows where her recorded daily value sits relative to it.`;
    const comparisons = [
      { label: "Feeds", value: dailyFeeds, average: 10, display: `${dailyFeeds.toFixed(1)} / day`, averageLabel: "10" },
      { label: "Bottle milk", value: dailyBottleMilk, average: 480, display: `${Math.round(dailyBottleMilk)} ml`, averageLabel: "480 ml" },
      { label: "Diapers", value: dailyDiapers, average: 7, display: `${dailyDiapers.toFixed(1)} / day`, averageLabel: "7" },
      { label: "Sleep", value: dailySleep / 60, average: 15.5, display: formatDuration(dailySleep), averageLabel: "15.5h" }
    ];
    $("#comparison-list").innerHTML = comparisons.map((item) => {
      const position = Math.max(10, Math.min(90, 50 + ((item.value - item.average) / item.average) * 32));
      return `<div class="comparison-row"><span class="comparison-label"><strong>${item.label}</strong><small>${BABY.shortName}’s daily signal</small></span><span class="comparison-track-wrap"><span class="comparison-track"><span class="comparison-value" style="left:${position}%">${item.display}</span><i class="comparison-point" style="left:${position}%"></i></span><span class="comparison-scale"><span>Lower</span><span>Avg ${item.averageLabel}</span><span>Higher</span></span></span></div>`;
    }).join("");

    renderCharts();
  }

  function renderCharts() {
    const days = [];
    for (let offset = -6; offset <= 0; offset += 1) {
      const date = dateAtOffset(offset, 12, 0);
      const dayEvents = state.events.filter((event) => isSameDay(event.timestamp, date));
      const totals = totalsFor(dayEvents);
      days.push({
        label: offset === 0 ? "Today" : `${new Intl.DateTimeFormat("en", { weekday: "narrow" }).format(date)} ${date.getDate()}`,
        feeds: totals.feeds,
        wet: totals.wet,
        dirty: totals.dirty,
        current: offset === 0
      });
    }
    const averageFeeds = days.reduce((sum, day) => sum + day.feeds, 0) / 7;
    const averageDiapers = days.reduce((sum, day) => sum + day.wet + day.dirty, 0) / 7;
    const max = Math.max(12, Math.ceil(averageFeeds + 2), Math.ceil(averageDiapers + 2), ...days.flatMap((day) => [day.feeds, day.wet + day.dirty]));
    const plotHeight = 117;
    const feedLineBottom = 24 + (averageFeeds / max) * plotHeight;
    const diaperLineBottom = 24 + (averageDiapers / max) * plotHeight;
    $("#activity-chart").innerHTML = `
      <div class="dual-chart-grid"></div>
      <div class="average-line feed-average" style="bottom:${feedLineBottom}px" title="${averageFeeds.toFixed(1)} average feeds per day"></div>
      <div class="average-line diaper-average" style="bottom:${diaperLineBottom}px" title="${averageDiapers.toFixed(1)} average diapers per day"></div>
      <div class="dual-bars">${days.map((day) => {
        const diaperTotal = day.wet + day.dirty;
        const feedHeight = Math.max(2, (day.feeds / max) * plotHeight);
        const diaperHeight = Math.max(2, (diaperTotal / max) * plotHeight);
        const wetShare = diaperTotal ? (day.wet / diaperTotal) * 100 : 0;
        const dirtyShare = diaperTotal ? (day.dirty / diaperTotal) * 100 : 0;
        return `<span class="dual-day"><span class="day-bar-pair"><i class="feed-bar" style="height:${feedHeight}px" title="${day.feeds} feeds"></i><i class="diaper-stack" style="height:${diaperHeight}px" title="${day.wet} wet, ${day.dirty} dirty"><b class="diaper-wet" style="height:${wetShare}%"></b><b class="diaper-dirty" style="height:${dirtyShare}%"></b></i></span><small class="day-label ${day.current ? "today" : ""}">${day.label}</small></span>`;
      }).join("")}</div>`;
    $("#feed-chart-average").textContent = averageFeeds.toFixed(1);
    $("#diaper-chart-average").textContent = averageDiapers.toFixed(1);

    const today = totalsFor(eventsForToday());
    const activeSleepMinutes = state.activeSessions?.sleep ? Math.max(0, (Date.now() - new Date(state.activeSessions.sleep.startedAt).getTime()) / 60000) : 0;
    const todaySleep = today.sleepMinutes + activeSleepMinutes;
    $("#sleep-chart-average").textContent = `Total sleep · ${formatDuration(todaySleep)}`;
    $("#sleep-track-fill").style.width = `${Math.max(0, Math.min(100, ((todaySleep / 60 - 10) / 10) * 100))}%`;
  }

  function renderReports() {
    const today = totalsFor(dailyReportEvents());
    $("#daily-report-copy").textContent = `Today ${BABY.shortName} had ${today.feeds} ${today.feeds === 1 ? "feed" : "feeds"}, ${today.wet} wet ${today.wet === 1 ? "diaper" : "diapers"}, ${today.dirty} dirty ${today.dirty === 1 ? "diaper" : "diapers"}, and ${formatDuration(today.sleepMinutes)} recorded sleep. Her activity can be compared with her own pattern over time.`;
    $("#daily-tip").textContent = today.sleepMinutes < 12 * 60
      ? "Some sleep may still be unlogged. Add missing naps before using today’s comparison."
      : "Keep tonight’s feeds calm and the room softly lit to make settling easier.";

    const weekly = totalsFor(eventsSince(7));
    $("#weekly-feeds").textContent = weekly.feeds;
    $("#weekly-diapers").textContent = weekly.diapers;
    $("#weekly-sleep").textContent = `${Math.round(weekly.sleepMinutes / 60)}h`;
    $("#daily-toggle").checked = state.settings.dailyReport;
    $("#weekly-toggle").checked = state.settings.weeklyReport;
  }

  function renderDate() {
    $("#today-label").textContent = new Intl.DateTimeFormat("en", {
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(now());
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

  function renderSession() {
    const container = $("#active-sessions");
    const sessions = state.activeSessions || { sleep: null, feed: null };
    const cards = [];
    if (sessions.sleep) cards.push({ key: "sleep", session: sessions.sleep, label: "Sleep in progress", icon: icons.sleep });
    if (sessions.feed) {
      const feed = sessions.feed;
      const label = feed.mode === "bottle" ? `${feed.milk} bottle in progress` : `${feed.side || "Breast"} feed in progress`;
      cards.push({ key: "feed", session: feed, label, icon: icons.feed });
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
    renderReports();
    renderSession();
  }

  function showToast() {}

  function addActivity(event, message = "Activity logged") {
    state.events.push(event);
    saveState();
    renderAll();
    closeSheet();
    showToast(message, true);
  }

  function addActivityWithWakeCheck(event, message, activityLabel) {
    const sleepWasRunning = Boolean(state.activeSessions?.sleep);
    addActivity(event, message);
    if (sleepWasRunning) openWakeConfirmation(activityLabel);
  }

  function openWakeConfirmation(activityLabel) {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Sleep is still running</p><h2 id="sheet-title">Did ${BABY.shortName} wake up?</h2><p class="sheet-subtitle">The ${activityLabel} was logged. Tell LittleLog whether to stop the sleep timer.</p></header>
      <div class="wake-choice"><button class="sheet-primary" id="wake-yes" type="button">Yes, stop sleep</button><button class="sheet-secondary" id="wake-no" type="button">No, keep sleep running</button></div>
    `);
    $("#wake-yes").addEventListener("click", () => stopSleepSession(`Sleep ended after ${activityLabel}`));
    $("#wake-no").addEventListener("click", () => {
      closeSheet();
      showToast(`${activityLabel[0].toUpperCase() + activityLabel.slice(1)} logged · sleep continues`, false);
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

  function openLogTimeSheet(activityLabel, onConfirm) {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Log time</p><h2 id="sheet-title">When did ${activityLabel} happen?</h2><p class="sheet-subtitle">Choose right now or scroll back to the time it happened.</p></header>
      <div class="sheet-tabs time-choice" role="group" aria-label="Choose log time">
        <button class="active" data-log-time="now" type="button">Right now</button>
        <button data-log-time="earlier" type="button">Earlier</button>
      </div>
      <div class="time-scroller-panel hidden" id="time-scroller-panel">
        <span class="time-scroller-value"><small>How long ago?</small><strong id="time-scroller-value">15 min ago</strong></span>
        <input class="time-scroller" id="time-scroller" type="range" min="5" max="720" step="5" value="15" aria-label="Minutes before now" />
        <span class="time-scroller-labels"><span>5 min</span><span>6 hours</span><span>12 hours</span></span>
        <span class="time-preview"><small>LittleLog will record</small><strong id="time-preview-value"></strong></span>
      </div>
      <div class="sheet-actions"><button class="sheet-primary" id="confirm-log-time" type="button">Log ${activityLabel} now</button></div>
    `);

    let mode = "now";
    let minutesAgo = 15;
    const slider = $("#time-scroller");
    const selectedTime = () => new Date(Date.now() - (mode === "earlier" ? minutesAgo : 0) * 60000);
    const renderTime = () => {
      const timestamp = selectedTime();
      $("#time-scroller-value").textContent = `${minutesAgo} min ago`;
      $("#time-preview-value").textContent = new Intl.DateTimeFormat("en", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit"
      }).format(timestamp);
      $("#confirm-log-time").textContent = mode === "now"
        ? `Log ${activityLabel} now`
        : `Log ${activityLabel} at ${formatTime(timestamp)}`;
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
    $("#confirm-log-time").addEventListener("click", () => onConfirm(selectedTime()));
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
        addActivityWithWakeCheck(makeEvent("diaper", titles[kind], note || (kind === "wet" ? "Medium" : "Logged"), loggedAt, { kind, note }), `${titles[kind]} logged`, "diaper");
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

  function stopSleepSession(message = "Sleep timer stopped") {
    const session = state.activeSessions?.sleep;
    if (!session) return;
    const endedAt = now();
    const exactMinutes = Math.max(0, (endedAt.getTime() - new Date(session.startedAt).getTime()) / 60000);
    const durationMin = Math.max(1, Math.round(exactMinutes));
    state.activeSessions.sleep = null;
    addActivity(makeEvent("sleep", "Sleep", exactMinutes < 1 ? "Less than 1 min" : formatDuration(durationMin), endedAt, {
      durationMin,
      startAt: session.startedAt,
      endAt: endedAt.toISOString()
    }), message);
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
      <p class="info-copy"><strong>Broad ranges, not scores.</strong> LittleLog compares patterns with age-adjusted references and ${BABY.shortName}’s own history. It avoids labeling a baby “normal” or “abnormal.”</p>
      <p class="info-copy">Mixed feeding is handled carefully: bottle volume can be totaled, but the app will never guess how much milk was taken during breastfeeding.</p>
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
      <p class="info-copy">Your records look steady. Keep tonight’s feeds calm and the room softly lit to make settling easier.</p>
      <div class="sheet-actions"><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
  }

  function openWeeklyReport() {
    const totals = totalsFor(eventsSince(7));
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Weekly review</p><h2 id="sheet-title">Steady routines are forming</h2><p class="sheet-subtitle">A concise summary to keep or show a pediatrician.</p></header>
      <div class="mini-report">
        <div class="mini-report-row"><span>Total feeds</span><strong>${totals.feeds}</strong></div>
        <div class="mini-report-row"><span>Breast milk by bottle</span><strong>${totals.breastMilk} ml</strong></div>
        <div class="mini-report-row"><span>Formula by bottle</span><strong>${totals.formula} ml</strong></div>
        <div class="mini-report-row"><span>Wet / dirty diapers</span><strong>${totals.wet} / ${totals.dirty}</strong></div>
        <div class="mini-report-row"><span>Recorded sleep</span><strong>${formatDuration(totals.sleepMinutes)}</strong></div>
      </div>
      <p class="info-copy"><strong>Pattern:</strong> Feeding frequency and wet diapers remained steady across the week. Continue logging consistently so comparisons become more useful.</p>
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

  function openSettings() {
    openSheet(`
      <header class="sheet-header"><p class="eyebrow">Settings</p><h2 id="sheet-title">Preferences</h2><p class="sheet-subtitle">Care records and preferences sync securely across approved devices.</p></header>
      <div class="mini-report">
        <div class="mini-report-row"><span>Time zone</span><strong>Asia/Saigon</strong></div>
        <div class="mini-report-row"><span>Units</span><strong>Metric</strong></div>
        <div class="mini-report-row"><span>Daily report</span><strong>8:00 PM</strong></div>
        <div class="mini-report-row"><span>Weekly report</span><strong>Sunday · 8:00 PM</strong></div>
        <div class="mini-report-row"><span>Storage</span><strong>Railway PostgreSQL</strong></div>
      </div>
      <div class="sheet-actions two"><button class="sheet-secondary" id="sign-out-littlelog" type="button">Sign out</button><button class="sheet-primary" data-close-sheet type="button">Done</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
    $("#sign-out-littlelog").addEventListener("click", signOutLittleLog);
  }

  function clearHistory() {
    state.deletedEventIds = [...new Set([...(state.deletedEventIds || []), ...state.events.map((event) => event.id)])];
    state.events = [];
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
      <header class="sheet-header"><p class="eyebrow">Clear records</p><h2 id="sheet-title">Delete activity history?</h2><p class="sheet-subtitle">This removes all recorded feeds, diapers, sleep sessions, baths, and notes. Active timers will keep running.</p></header>
      <div class="sheet-actions two"><button class="sheet-secondary" data-close-sheet type="button">Cancel</button><button class="sheet-danger" id="confirm-clear" type="button">Clear history</button></div>
    `);
    $('[data-close-sheet]').addEventListener("click", closeSheet);
    $("#confirm-clear").addEventListener("click", clearHistory);
  }

  function navigate(viewName) {
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
      if (action === "bath") openBathSheet();
    }));
    $("#sheet-close").addEventListener("click", closeSheet);
    $("#sheet-backdrop").addEventListener("click", closeSheet);
    $("#timeline").addEventListener("click", (event) => {
      const button = event.target.closest("[data-event-id]");
      if (button) openEventSheet(button.dataset.eventId);
    });
    $("#active-sessions").addEventListener("click", (event) => {
      const button = event.target.closest("[data-stop-session]");
      if (!button) return;
      if (button.dataset.stopSession === "sleep") stopSleepSession();
      if (button.dataset.stopSession === "feed") stopFeedSession();
    });
    $("#clear-demo").addEventListener("click", confirmClearHistory);
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
    $("#preview-notification").addEventListener("click", openNotificationPreview);
    $("#open-weekly").addEventListener("click", openWeeklyReport);
    $("#daily-toggle").addEventListener("change", (event) => { state.settings.dailyReport = event.target.checked; saveState(); showToast(event.target.checked ? "Daily report enabled" : "Daily report paused", false); });
    $("#weekly-toggle").addEventListener("change", (event) => { state.settings.weeklyReport = event.target.checked; saveState(); showToast(event.target.checked ? "Weekly report enabled" : "Weekly report paused", false); });

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
  window.addEventListener("focus", refreshFromServer);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshFromServer();
  });
  setInterval(() => {
    updateStatusTime();
    if (!syncReady) return;
    renderLastFeed();
    if (state.activeSessions?.sleep) renderCharts();
  }, 30000);
  setInterval(refreshFromServer, 45000);
})();
