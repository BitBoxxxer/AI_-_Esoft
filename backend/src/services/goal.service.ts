import { prisma } from "../config/prisma";

interface CreateGoalDto {
  title: string;
  columnId?: string;
  description?: string;
  targetCommits?: number;
  targetPRs?: number;
  targetIssues?: number;
  deadline?: string;
  githubIssueUrl?: string;
}

class GoalService {
  async getGoals(userId: string) {
    return prisma.goal.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async createGoal(userId: string, dto: CreateGoalDto) {
    return prisma.goal.create({
      data: {
        userId,

        title: dto.title,

        columnId: dto.columnId || "",

        description: dto.description || null,

        targetCommits: dto.targetCommits || null,

        targetPRs: dto.targetPRs || null,

        targetIssues: dto.targetIssues || null,

        deadline: dto.deadline ? new Date(dto.deadline) : null,

        githubIssueUrl: dto.githubIssueUrl || null,
      },
    });
  }

  async getGoalById(id: string) {
    return prisma.goal.findUnique({ where: { id } });
  }

  async updateGoal(id: string, dto: Partial<CreateGoalDto> & { completed?: boolean }) {
    const updateData: Record<string, unknown> = {};

    if (typeof dto.completed === "boolean") updateData.completed = dto.completed;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.deadline !== undefined)
      updateData.deadline = dto.deadline ? new Date(dto.deadline) : null;
    if (dto.githubIssueUrl !== undefined) updateData.githubIssueUrl = dto.githubIssueUrl;
    if (dto.columnId !== undefined) updateData.columnId = dto.columnId;
    if (dto.targetCommits !== undefined) updateData.targetCommits = dto.targetCommits;
    if (dto.targetPRs !== undefined) updateData.targetPRs = dto.targetPRs;
    if (dto.targetIssues !== undefined) updateData.targetIssues = dto.targetIssues;

    return prisma.goal.update({ where: { id }, data: updateData });
  }

  async deleteGoal(id: string) {
    return prisma.goal.delete({ where: { id } });
  }
}

export default new GoalService();