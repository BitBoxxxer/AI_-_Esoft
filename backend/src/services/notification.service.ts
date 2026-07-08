import { prisma } from "../config/prisma";

class NotificationService {
  async getNotifications(userId: string, onlyUnread: boolean) {
    return prisma.notification.findMany({
      where: {
        userId,
        ...(onlyUnread ? { read: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  }

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}

export default new NotificationService();
