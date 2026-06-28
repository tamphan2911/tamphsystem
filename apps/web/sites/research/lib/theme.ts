import { researchHour } from "./date-time";

export const researchThemeKey = "research-theme-mode";
export const researchThemePreferenceKey = "research-theme-preference";

export type ResearchTheme = "dark" | "light";
export type ResearchThemePreference = "system" | ResearchTheme;

export function timeBasedResearchTheme(date = new Date()): ResearchTheme {
  const hour = researchHour(date);
  return hour >= 6 && hour < 18 ? "light" : "dark";
}

export function normalizedResearchThemePreference(
  preference: string | null | undefined,
): ResearchThemePreference {
  return preference === "light" || preference === "dark"
    ? preference
    : "system";
}

export function themeForPreference(
  preference: ResearchThemePreference,
): ResearchTheme {
  return preference === "system" ? timeBasedResearchTheme() : preference;
}
