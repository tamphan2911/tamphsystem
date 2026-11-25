export const CAM_INSIGHT_SUGGESTION_VERSION = 2;

export function hasCurrentInsightSuggestion(source: unknown) {
  return Boolean(source) && typeof source === "object" && !Array.isArray(source)
    && (source as Record<string, unknown>).suggestionVersion === CAM_INSIGHT_SUGGESTION_VERSION;
}

export function insightInstructions(period: "daily" | "weekly") {
  const window = period === "daily" ? "completed care day" : "completed baby-age week";
  return [
    `Write a calm, useful LittleLog interpretation of the ${window} for Cam's parent.`,
    "The report already shows every count and total. Do not restate them, quote any numbers or ranges, or list the metrics in prose.",
    "Read the current pattern, previous period, logged-day average, and broad age reference together. Choose the most meaningful signal rather than describing every metric.",
    "Write exactly two short sentences, with no heading or bullets. In the first, say whether the logged pattern seems broadly reassuring, worth watching, concerning, or too incomplete to judge, and briefly explain why in qualitative terms. In the second, suggest one practical next step that fits that judgment.",
    "Use the age reference only as broad educational context. Missing entries and unmeasured direct breastfeeding can make recorded totals look low; a single low log cannot establish a problem. Never diagnose or claim Cam is definitely well or unwell.",
    "If feeding or wet diapers appear to drop markedly, advise contacting Cam's pediatrician. Otherwise, suggest observing feeding cues and wet diapers or improving the log. Do not recommend changing feeding amounts, supplements, medicines, or sleep arrangements.",
  ].join(" ");
}

export function qualitativeSuggestion(text: string) {
  const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length < 2) return null;
  const result = sentences.slice(0, 2)
    .map((sentence) => /[.!?]$/.test(sentence) ? sentence : `${sentence}.`)
    .join(" ");
  if (/\d|\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b|\bone\s+(?:feed|diaper|bottle|hour|day|week|ml)\b/i.test(result)) return null;
  return result;
}

export function unavailableSuggestion(hasLoggedActivity: boolean) {
  return hasLoggedActivity
    ? "The AI review is temporarily unavailable. Keep watching feeding and wet diapers, and ask Cam's pediatrician if either changes markedly."
    : "There is not enough logged activity to assess a pattern yet. Keep recording feeds and wet diapers, then check the next review.";
}
