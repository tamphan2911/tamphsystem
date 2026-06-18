import { Prisma, Role } from "@repo/db";

export function hasUnrestrictedVenueAccess(roles: Role[]) {
  return roles.some(
    (role) =>
      role === Role.ADMIN ||
      role === Role.ASSISTANT ||
      role === Role.CHIEF_ASSISTANT,
  );
}

export function associatedResearchWhere(
  userId: string,
): Prisma.ResearchProjectWhereInput {
  return {
    OR: [
      { leadResearcherId: userId },
      { authors: { some: { id: userId } } },
      { authorEntries: { some: { userId } } },
      {
        organizedProjectLinks: {
          some: {
            organizedProject: { members: { some: { userId } } },
          },
        },
      },
    ],
  };
}

export function accessibleJournalWhere(
  userId: string,
): Prisma.JournalWhereInput {
  const project = associatedResearchWhere(userId);
  return {
    OR: [
      { submissions: { some: { project } } },
      { suggestions: { some: { project } } },
    ],
  };
}

export function accessibleConferenceWhere(
  userId: string,
): Prisma.ConferenceWhereInput {
  const project = associatedResearchWhere(userId);
  return {
    OR: [
      { submissions: { some: { project } } },
      { suggestions: { some: { project } } },
    ],
  };
}
