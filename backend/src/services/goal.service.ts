import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";

export interface CreateGoalDto {
  title: string;
  description?: string;
  deadline?: string;
  githubIssueUrl?: string;
  columnId?: string;
  targetCommits?: number;
  targetPRs?: number;
  targetIssues?: number;
}

class GoalService {
  async getGoals(userId: string) {
    return withRetry(() =>
      prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: { column: true },
      })
    );
  }

  async createGoal(userId: string, dto: CreateGoalDto) {
    return withRetry(() =>
      prisma.goal.create({
        data: {
          userId,
          title: dto.title,
          description: dto.description,
          deadline: dto.deadline ? new Date(dto.deadline) : undefined,
          githubIssueUrl: dto.githubIssueUrl,
          columnId: dto.columnId,
          targetCommits: dto.targetCommits,
          targetPRs: dto.targetPRs,
          targetIssues: dto.targetIssues,
        },
      })
    );
  }

  async getGoalById(id: string) {
    return withRetry(() => prisma.goal.findUnique({ where: { id } }));
  }

  async updateGoal(id: string, dto: Partial<CreateGoalDto> & { completed?: boolean }) {
    const updateData: Record<string, unknown> = {};
    if (typeof dto.completed === "boolean") updateData.completed = dto.completed;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.deadline !== undefined) updateData.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.githubIssueUrl !== undefined) updateData.githubIssueUrl = dto.githubIssueUrl;
    if (dto.columnId !== undefined) updateData.columnId = dto.columnId;
    if (dto.targetCommits !== undefined) updateData.targetCommits = dto.targetCommits;
    if (dto.targetPRs !== undefined) updateData.targetPRs = dto.targetPRs;
    if (dto.targetIssues !== undefined) updateData.targetIssues = dto.targetIssues;

    return withRetry(() => prisma.goal.update({ where: { id }, data: updateData }));
  }

  async deleteGoal(id: string) {
    return withRetry(() => prisma.goal.delete({ where: { id } }));
  }
}

export default new GoalService();
