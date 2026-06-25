import { prisma } from "@repo/db";

const RESEARCH_NOTIFICATION_RETENTION_DAYS = 7;

export function researchNotificationRetentionCutoff(now = new Date()) {
  return new Date(
    now.getTime() - RESEARCH_NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
}

export async function deleteExpiredResearchNotifications() {
  return prisma.researchNotification.deleteMany({
    where: {
      createdAt: {
        lt: researchNotificationRetentionCutoff(),
      },
    },
  });
}
