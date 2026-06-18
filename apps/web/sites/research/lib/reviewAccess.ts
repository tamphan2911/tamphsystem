import { Prisma, Role } from "@repo/db";

export function canAccessAllResearchReviews(roles: Role[]) {
  return roles.includes(Role.ADMIN);
}

export function assignedResearchReviewWhere(
  userId: string,
): Prisma.AcademicReviewWhereInput {
  return {
    tasks: {
      some: {
        assignments: { some: { userId } },
      },
    },
  };
}

export function accessibleResearchReviewWhere(
  roles: Role[],
  userId: string,
): Prisma.AcademicReviewWhereInput {
  return canAccessAllResearchReviews(roles)
    ? {}
    : assignedResearchReviewWhere(userId);
}
