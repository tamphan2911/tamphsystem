import { Role } from "@repo/db";

const fullAccountAccessEmails = new Set(["hongtuyetph@gmail.com"]);

export function canManageAllResearchAccounts({
  roles,
  email,
}: {
  roles: Role[];
  email?: string | null;
}) {
  if (roles.includes(Role.ADMIN) || roles.includes(Role.CHIEF_ASSISTANT)) {
    return true;
  }

  return fullAccountAccessEmails.has((email ?? "").trim().toLowerCase());
}
