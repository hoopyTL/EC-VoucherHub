import { Router, Request, Response } from 'express'
import prisma from '~/configs/prisma'
import { ApiResponse } from '~/utils/api-response'
import { asyncHandler } from '~/utils/async-handler'

export const contentRoutes = Router()

const validTypes = ['banner', 'announcement', 'policy', 'faq'] as const

contentRoutes.get(
  '/content',
  asyncHandler(async (req: Request, res: Response) => {
    const type = typeof req.query.type === 'string' ? req.query.type.toLowerCase() : undefined
    const now = new Date()

    const items = await prisma.contentItem.findMany({
      where: {
        status: 'published',
        ...(type && validTypes.includes(type as (typeof validTypes)[number]) ? { type } : {}),
        AND: [
          {
            OR: [{ displayFrom: null }, { displayFrom: { lte: now } }]
          },
          {
            OR: [{ displayTo: null }, { displayTo: { gte: now } }]
          }
        ]
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    })

    ApiResponse.success(res, { items })
  })
)
