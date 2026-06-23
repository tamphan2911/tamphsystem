import { JournalApprovalStatus, Prisma, Role } from "@repo/db";

export function hasUnrestrictedVenueAccess(roles: Role[]) {
  return roles.some(
    (role) =>
      role === Role.ADMIN ||
      role === Role.ASSISTANT ||
      role === Role.CHIEF_ASSISTANT,
  );
}

export function staffJournalAccessWhere(
  roles: Role[],
  userId?: string,
): Prisma.JournalWhereInput | null {
  if (roles.includes(Role.ADMIN)) return {};
  if (roles.includes(Role.ASSISTANT) || roles.includes(Role.CHIEF_ASSISTANT)) {
    return {
      OR: [
        { approvalStatus: JournalApprovalStatus.APPROVED },
        ...(userId && roles.includes(Role.CHIEF_ASSISTANT)
          ? [{ resultTask: { checkerId: userId } }]
          : []),
      ],
    };
  }
  return null;
}

export function staffPublisherAccessWhere(
  roles: Role[],
  userId?: string,
): Prisma.PublisherWhereInput | null {
  if (roles.includes(Role.ADMIN)) return {};
  if (userId && roles.includes(Role.CHIEF_ASSISTANT)) {
    return { journals: { some: { resultTask: { checkerId: userId } } } };
  }
  return null;
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
      { resultTask: { checkerId: userId } },
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
