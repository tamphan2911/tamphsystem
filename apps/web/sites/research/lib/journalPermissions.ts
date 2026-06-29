const journalDetailEditorEmails = new Set(["hongtuyetph.ntc@gmail.com"]);

export function canEditJournalDetailsByEmail(email?: string | null) {
  return journalDetailEditorEmails.has(email?.trim().toLowerCase() ?? "");
}
