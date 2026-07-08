import { Response } from "express";
import notificationService from "../services/notification.service";
import { AuthRequest } from "../middlewares/auth.middleware";

class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    const onlyUnread = req.query.unread === "true";
    const notifications = await notificationService.getNotifications(
      req.user!.id,
      onlyUnread
    );
    return res.json(notifications);
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    await notificationService.markAllAsRead(req.user!.id);
    return res.json({ success: true });
  }
}

export default new NotificationController();
