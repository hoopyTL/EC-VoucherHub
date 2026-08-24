import { z } from 'zod'

export const processPaymentSchema = z.object({
  outcome: z.enum(['SUCCESS', 'FAILURE'] as const)
})

export type ProcessPaymentDto = z.infer<typeof processPaymentSchema>
