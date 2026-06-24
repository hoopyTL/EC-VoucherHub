import type { Request, Response, NextFunction } from 'express'

import { AppError } from '~/utils/app-error'
import { ErrorCode } from '~/utils/error-codes'
import { env } from '~/configs/env'

interface ErrorResponseBody {
    success: false
    error: {
        code: string
        message: string
        details?: unknown
    }
}

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    // 1. AppError
    if (err instanceof AppError) {
        const body: ErrorResponseBody = {
            success: false,
            error: {
                code: err.code,
                message: err.message,
                ...(err.details !== undefined && { details: err.details }),
            },
        }
        res.status(err.statusCode).json(body)
        return
    }

    // 2. Zod validation errors
    if (err.name === 'ZodError' && 'issues' in err) {
        const issues = (err as { issues: Array<{ path: (string | number)[]; message: string }> }).issues
        const details = issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
        }))

        const body: ErrorResponseBody = {
            success: false,
            error: {
                code: ErrorCode.VALIDATION_ERROR,
                message: 'Validation failed',
                details,
            },
        }
        res.status(400).json(body)
        return
    }

    // 3. Malformed JSON body (Express json() parser)
    if (err instanceof SyntaxError && 'body' in err) {
        const body: ErrorResponseBody = {
            success: false,
            error: {
                code: ErrorCode.BAD_REQUEST,
                message: 'Malformed JSON in request body',
            },
        }
        res.status(400).json(body)
        return
    }

    // 4. Prisma known errors
    if (err.constructor?.name === 'PrismaClientKnownRequestError' && 'code' in err) {
        const prismaErr = err as { code: string; meta?: { target?: string[] } }

        if (prismaErr.code === 'P2002') {
            // Unique constraint violation
            const body: ErrorResponseBody = {
                success: false,
                error: {
                    code: ErrorCode.DUPLICATE_ENTRY,
                    message: 'A record with this value already exists',
                    details: prismaErr.meta?.target
                        ? { fields: prismaErr.meta.target }
                        : undefined,
                },
            }
            res.status(409).json(body)
            return
        }

        if (prismaErr.code === 'P2025') {
            // Record not found
            const body: ErrorResponseBody = {
                success: false,
                error: {
                    code: ErrorCode.RESOURCE_NOT_FOUND,
                    message: 'Record not found',
                },
            }
            res.status(404).json(body)
            return
        }
    }

    // 5. Unknown / unhandled — log + generic response
    console.error('Unhandled error:', err)

    const body: ErrorResponseBody = {
        success: false,
        error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message || 'Internal server error',
            ...(env.NODE_ENV !== 'production' && { details: { stack: err.stack } }),
        },
    }
    res.status(500).json(body)
}
