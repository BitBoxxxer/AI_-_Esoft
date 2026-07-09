import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";

class NotificationService {
  async getNotifications(userId: string, onlyUnread: boolean) {
    return withRetry(() =>
      prisma.notification.findMany({
        where: { userId, ...(onlyUnread ? { read: false } : {}) },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    );
  }

  async markAllAsRead(userId: string) {
    return withRetry(() =>
      prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
    );
  }
}

export default new NotificationService();
