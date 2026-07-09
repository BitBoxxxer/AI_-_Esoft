import { prisma } from "../config/prisma";
import { withRetry } from "../utils/prismaRetry";

class ColumnService {
  async getColumns(userId: string) {
    return withRetry(() =>
      prisma.goalColumn.findMany({
        where: { userId },
        orderBy: { order: "asc" },
        include: { goals: { orderBy: { createdAt: "desc" } } },
      })
    );
  }

  async getColumnById(id: string) {
    return withRetry(() => prisma.goalColumn.findUnique({ where: { id } }));
  }

  async createColumn(userId: string, title: string) {
    const last = await withRetry(() =>
      prisma.goalColumn.findFirst({ where: { userId }, orderBy: { order: "desc" } })
    );
    const order = last ? last.order + 1 : 0;
    return withRetry(() => prisma.goalColumn.create({ data: { userId, title, order } }));
  }

  async updateColumn(id: string, dto: { title?: string; order?: number }) {
    const update: Record<string, unknown> = {};
    if (dto.title !== undefined) update.title = dto.title;
    if (dto.order !== undefined) update.order = dto.order;
    return withRetry(() => prisma.goalColumn.update({ where: { id }, data: update }));
  }

  async deleteColumn(id: string) {
    await withRetry(() => prisma.goal.deleteMany({ where: { columnId: id } }));
    return withRetry(() => prisma.goalColumn.delete({ where: { id } }));
  }
}

export default new ColumnService();
