import { prisma } from "../config/prisma";

const PROFILE_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  githubLogin: true,
  dailyGoal: true,
  notifyAboutGoal: true,
} as const;

class UserService {
  async getProfile(userId: string) {
    return prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
  }

  async updateProfile(
    userId: string,
    dto: { dailyGoal?: number; notifyAboutGoal?: boolean }
  ) {
    const updateData: Record<string, unknown> = {};
    if (typeof dto.dailyGoal === "number") updateData.dailyGoal = dto.dailyGoal;
    if (typeof dto.notifyAboutGoal === "boolean")
      updateData.notifyAboutGoal = dto.notifyAboutGoal;

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: PROFILE_SELECT,
    });
  }

  async updateDailyGoal(userId: string, dailyGoal: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { dailyGoal },
    });
  }
}

export default new UserService();
