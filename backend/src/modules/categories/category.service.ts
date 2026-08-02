import prisma from '~/configs/prisma'

export async function getCategories() {
  return prisma.category.findMany({
    orderBy: {
      id: 'asc'
    }
  })
}
