import { ProposalStatus, Prisma, Role } from "@repo/db";

export function canAccessAllResearchProposals(roles: Role[]) {
  return roles.includes(Role.ADMIN);
}

export function relatedResearchProposalWhere({
  userId,
  roles,
}: {
  userId: string;
  roles: Role[];
}): Prisma.ProposalWhereInput {
  if (canAccessAllResearchProposals(roles)) return {};

  return {
    OR: [
      { submittedById: userId },
      { task: { is: { createdById: userId } } },
      { task: { is: { checkerId: userId } } },
      { task: { is: { assignments: { some: { userId } } } } },
    ],
  };
}

export function proposalIsOpenForEditing(status: ProposalStatus) {
  return status === ProposalStatus.NEW || status === ProposalStatus.REVIEWING;
}
