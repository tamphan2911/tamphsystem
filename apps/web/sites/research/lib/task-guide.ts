export const taskGuideTypeOptions = [
  "SUBMIT_RESEARCH",
  "SUBMIT_CONFERENCE",
  "PRODUCTION",
  "REVIEW",
  "PROJECT_PRODUCTION",
  "PROJECT_RESEARCH_ASSOCIATED",
  "OTHER",
] as const;

export type TaskGuideType = (typeof taskGuideTypeOptions)[number];

export function taskGuideTypeLabel(value: string) {
  const labels: Record<string, string> = {
    SUBMIT_RESEARCH: "Submit to journal",
    SUBMIT_CONFERENCE: "Submit to conference",
    PRODUCTION: "Research production",
    REVIEW: "Academic review",
    PROJECT_PRODUCTION: "Project production",
    PROJECT_RESEARCH_ASSOCIATED: "Project research associated",
    OTHER: "Other task",
  };
  return labels[value] ?? value.replaceAll("_", " ").toLowerCase();
}
