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
  registrationIdentityValues: string[] = [],
): Prisma.ResearchProjectWhereInput {
  return {
    OR: [
      { leadResearcherId: userId },
      { authors: { some: { id: userId } } },
      { authorEntries: { some: { userId } } },
      { registrationUserId: userId },
      { tasks: { some: { assignments: { some: { userId } } } } },
      {
        organizedProjectLinks: {
          some: {
            organizedProject: { members: { some: { userId } } },
          },
        },
      },
      ...(registrationIdentityValues.length > 0
        ? [
            {
              registrationName: {
                in: registrationIdentityValues,
                mode: Prisma.QueryMode.insensitive,
              },
            } satisfies Prisma.ResearchProjectWhereInput,
          ]
        : []),
    ],
  };
}

export function accessibleJournalWhere(
  userId: string,
  registrationIdentityValues: string[] = [],
): Prisma.JournalWhereInput {
  const project = associatedResearchWhere(userId, registrationIdentityValues);
  return {
    OR: [
      { submissions: { some: { project } } },
      { suggestions: { some: { project } } },
    ],
  };
}

export function accessibleConferenceWhere(
  userId: string,
  registrationIdentityValues: string[] = [],
): Prisma.ConferenceWhereInput {
  const project = associatedResearchWhere(userId, registrationIdentityValues);
  return {
    OR: [
      { submissions: { some: { project } } },
      { suggestions: { some: { project } } },
    ],
  };
}
