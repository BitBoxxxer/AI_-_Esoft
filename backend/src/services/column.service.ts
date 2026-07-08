import { prisma } from "../config/prisma";

class ColumnService {
  async getColumns(userId: string) {
    return prisma.goalColumn.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      include: {
        goals: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async getColumnById(id: string) {
    return prisma.goalColumn.findUnique({ where: { id } });
  }

  async createColumn(userId: string, title: string) {
    const last = await prisma.goalColumn.findFirst({
      where: { userId },
      orderBy: { order: "desc" },
    });
    const order = last ? last.order + 1 : 0;

    return prisma.goalColumn.create({
      data: { userId, title, order },
    });
  }

  async updateColumn(id: string, dto: { title?: string; order?: number }) {
    const update: Record<string, unknown> = {};
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.order !== undefined) update.order = dto.order;

    return prisma.goalColumn.update({ where: { id }, data: update });
  }

  async deleteColumn(id: string) {
    await prisma.goal.deleteMany({ where: { columnId: id } });
    return prisma.goalColumn.delete({ where: { id } });
  }
}

export default new ColumnService();
