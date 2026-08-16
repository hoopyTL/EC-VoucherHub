import prisma from '~/configs/prisma'

export const categoryService = {
  list() {
    return prisma.category.findMany({ orderBy: [{ parentId: 'asc' }, { name: 'asc' }] })
  }
}
